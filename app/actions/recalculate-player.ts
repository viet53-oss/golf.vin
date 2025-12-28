'use server';

import { prisma } from '@/lib/prisma';
import { calculateHandicap, HandicapInput } from '@/lib/handicap';

/**
 * Recalculate handicap for a single player after a score update
 * This is more efficient than recalculating all players
 */
export async function recalculatePlayerHandicap(playerId: string) {
    try {
        // Fetch player with all rounds
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: {
                rounds: {
                    include: { round: true, tee_box: true },
                    orderBy: { round: { date: 'asc' } }
                },
                manual_rounds: {
                    orderBy: { date_played: 'asc' }
                }
            }
        });

        if (!player) {
            console.error(`Player ${playerId} not found`);
            return;
        }

        // Combine and Sort All Rounds Chronologically
        type HistoryItem =
            | { type: 'v3'; date: string; id: string; score: number; rating: number; slope: number; timestamp: number }
            | { type: 'v2'; date: string; id: string; differential: number; timestamp: number };

        const v3Rounds: HistoryItem[] = player.rounds
            .filter((r: any) => r.tee_box && (r.adjusted_gross_score || r.gross_score)) // Ensure complete data
            .map((r: any) => ({
                type: 'v3',
                date: r.round.date,
                id: r.id,
                score: r.adjusted_gross_score || r.gross_score || 0,
                rating: r.tee_box!.rating,
                slope: r.tee_box!.slope,
                timestamp: new Date(r.round.date).getTime()
            }));

        const v2Rounds: HistoryItem[] = player.manual_rounds.map((r: any) => ({
            type: 'v2',
            date: r.date_played,
            id: r.id,
            differential: r.score_differential,
            timestamp: new Date(r.date_played).getTime()
        }));

        // Sort by Date ASC (Oldest first)
        const allHistory = [...v3Rounds, ...v2Rounds].sort((a, b) => a.timestamp - b.timestamp);

        // Replay History
        let currentHistory: HandicapInput[] = [];

        for (const round of allHistory) {
            // A. Calculate Index BEFORE this round
            const statsBefore = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);
            const indexBefore = statsBefore.handicapIndex;

            // B. Add this round to history
            if (round.type === 'v3') {
                currentHistory.push({
                    id: round.id,
                    date: round.date,
                    score: round.score,
                    rating: round.rating,
                    slope: round.slope
                } as HandicapInput);
            } else {
                currentHistory.push({
                    id: round.id,
                    date: round.date,
                    differential: round.differential
                } as HandicapInput);
            }

            // C. Calculate Index AFTER this round
            const statsAfter = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);
            const indexAfter = statsAfter.handicapIndex;

            // D. Update DB if it's a V3 round
            if (round.type === 'v3') {
                await prisma.roundPlayer.update({
                    where: { id: round.id },
                    data: {
                        index_at_time: indexBefore,
                        index_after: indexAfter
                    } as any
                });
            }
        }

        // Update Final Player Index
        const finalStats = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);
        await prisma.player.update({
            where: { id: player.id },
            data: { index: finalStats.handicapIndex }
        });

        console.log(`✅ Recalculated handicap for player ${player.name}: ${finalStats.handicapIndex.toFixed(1)}`);

    } catch (error) {
        console.error(`Error recalculating handicap for player ${playerId}:`, error);
    }
}

// Helper
function convertToHandicapInput(history: any[]): HandicapInput[] {
    return history.map(h => {
        if (h.differential !== undefined) {
            return { id: h.id, date: h.date, differential: h.differential } as HandicapInput;
        } else {
            return { id: h.id, date: h.date, score: h.score, rating: h.rating, slope: h.slope } as HandicapInput;
        }
    });
}
