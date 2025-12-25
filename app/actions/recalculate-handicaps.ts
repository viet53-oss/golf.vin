'use server';

import { prisma } from '@/lib/prisma';
import { calculateHandicap, HandicapInput } from '@/lib/handicap';
import { revalidatePath } from 'next/cache';

export async function recalculateAllHandicaps() {
    try {
        console.log('🚀 Starting Full Handicap Recalculation...');

        // 1. Fetch all players
        const players = await prisma.player.findMany({
            include: {
                rounds: {
                    include: { round: true, tee_box: true }
                },
                manual_rounds: true
            }
        });

        let updatedCount = 0;

        for (const player of players) {
            // 2. Combine and Sort All Rounds Chronologically
            type HistoryItem =
                | { type: 'v3'; date: string; id: string; score: number; rating: number; slope: number; timestamp: number }
                | { type: 'v2'; date: string; id: string; differential: number; timestamp: number };

            const v3Rounds: HistoryItem[] = player.rounds
                .filter((r: any) => r.tee_box) // Ensure complete data
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

            // 3. Replay History
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
                    updatedCount++;
                }
            }

            // 4. Update Final Player Index
            const finalStats = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);
            await prisma.player.update({
                where: { id: player.id },
                data: { index: finalStats.handicapIndex }
            });
        }

        console.log(`✅ Recalculation Complete. Updated ${updatedCount} rounds.`);

        revalidatePath('/scores');
        revalidatePath('/players');
        return { success: true, message: `Successfully recalculated handicaps for ${players.length} players.` };

    } catch (error) {
        console.error('Recalculation failed:', error);
        return { success: false, message: 'Failed to recalculate handicaps.' };
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
