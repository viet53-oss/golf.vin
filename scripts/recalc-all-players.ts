
// @ts-nocheck
// 1. Load Env
try { process.loadEnvFile('.env'); } catch (e) { }
try { process.loadEnvFile('.env.local'); } catch (e) { }
console.log('DB URL Check:', process.env.DATABASE_URL ? 'Loaded' : 'Missing');
console.log('POSTGRES_URL Check:', process.env.POSTGRES_URL ? 'Loaded' : 'Missing');

async function main() {
    console.log('Importing modules...');
    const { prisma } = await import('../lib/prisma');
    // Using simple require or import for logic
    const { calculateHandicap } = await import('../lib/handicap');

    type HandicapInput = {
        id: string;
        date: string; // YYYY-MM-DD
        differential?: number;
        score?: number;
        rating?: number;
        slope?: number;
    };

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

    async function recalculatePlayerHandicap(playerId: string) {
        try {
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

            if (!player) return;

            type HistoryItem =
                | { type: 'v3'; date: string; id: string; score: number; rating: number; slope: number; timestamp: number }
                | { type: 'v2'; date: string; id: string; differential: number; timestamp: number };

            const v3RoundsRaw = player.rounds;

            const v3Rounds: HistoryItem[] = v3RoundsRaw
                .filter((r: any) => {
                    const isNotLive = r.round.is_live !== true;
                    // FIX: Allow if score exists, ignoring completed flag to fix history
                    const score = r.adjusted_gross_score || r.gross_score;
                    const isHighEnough = score > 0; // Relaxed check
                    return r.tee_box && score && isNotLive;
                })
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

            const allHistory = [...v3Rounds, ...v2Rounds].sort((a, b) => a.timestamp - b.timestamp);

            let currentHistory: HandicapInput[] = [];

            for (const round of allHistory) {
                const statsBefore = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);
                const indexBefore = statsBefore.handicapIndex;

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

                const statsAfter = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);
                const indexAfter = statsAfter.handicapIndex;

                if (round.type === 'v3') {
                    await prisma.roundPlayer.update({
                        where: { id: round.id },
                        data: {
                            index_at_time: indexBefore,
                            index_after: indexAfter
                        }
                    });
                }
            }

            const finalStats = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);
            await prisma.player.update({
                where: { id: player.id },
                data: { index: finalStats.handicapIndex }
            });

            console.log(`✅ ${player.name}: ${finalStats.handicapIndex.toFixed(1)}`);

        } catch (error) {
            console.error(`Error recalculating handicap for player ${playerId}:`, error);
        }
    }

    console.log('Starting full recalculation...');
    const players = await prisma.player.findMany();
    console.log(`Recalculating for ${players.length} players...`);
    for (const p of players) {
        await recalculatePlayerHandicap(p.id);
    }
    console.log('Recalculation complete.');
}

main();
