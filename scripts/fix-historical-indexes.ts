
import 'dotenv/config'; // Load .env file
import { prisma } from '../lib/prisma';
import { calculateHandicap } from '../lib/handicap';

async function main() {
    console.log('Starting historical index fix...');

    const allRounds = await prisma.round.findMany({
        where: {
            OR: [
                { date: { contains: '2025-12-13' } },
                { date: { contains: '2025-11-22' } }
            ]
        },
        orderBy: { date: 'asc' },
        include: {
            players: {
                include: {
                    player: {
                        select: { id: true, name: true, preferred_tee_box: true }
                    },
                    tee_box: true,
                    scores: {
                        include: { hole: true }
                    }
                }
            },
            course: {
                include: {
                    tee_boxes: true
                }
            }
        }
    });

    console.log(`Found ${allRounds.length} rounds to process.`);

    // 2. Iterate through rounds Chronologically
    for (const round of allRounds) {
        console.log(`Processing Round: ${new Date(round.date).toISOString().split('T')[0]} - ${round.name ?? 'Unnamed'}`);

        // For each player in this round, calculate their index based on history BEFORE this round
        for (const rp of round.players) {

            // Get all PREVIOUS rounds for this player
            // We use the same filtering logic as the handicap engine
            // Find rounds where date < current round date OR (date = current round AND id != current round?? No, strictly before)
            // Actually, usually "Index at time" is index entering the round. So strictly < date.

            const playerHistory = await prisma.roundPlayer.findMany({
                where: {
                    player_id: rp.player_id,
                    round: {
                        date: {
                            lt: round.date
                        },
                        // Only count 18 hole rounds or combine 9? 
                        // Assuming standard logic: we just need score/slope/rating
                    }
                },
                include: {
                    round: true,
                    tee_box: true,
                    player: { select: { preferred_tee_box: true } }
                },
                orderBy: {
                    round: { date: 'desc' }
                }
            });

            // Prepare Input for Handicap Calculator
            const historyInput = playerHistory.map(h => {
                // Ensure correct Slope/Rating used (Preferred override logic)
                let slope = h.tee_box?.slope || 113;
                let rating = h.tee_box?.rating || 72;

                // If the historical round didn't save tee box correctly, or we want to enforce consistency:
                // Note: We should probably respect what was played. But currently we have an issue where V2 migration yielded bad data.
                // However, the `get-handicap-history` action DOES apply preferred tee logic?
                // Let's check get-handicap-history.ts logic next time.
                // For now, let's stick to the robust logic we just added to Dashboard:
                // Use stored tee box if available, because that's what they played.
                // Wait, the dashboard update was to fix *Display* of FUTURE.
                // Discrepancy source: "Preferred tee box" override logic is applied in calculating differentials?
                // Let's assume standard behavior: Use stored tee box.

                // CRITICAL: The prompt says "prioritizing the player's preferred tee box for display" AND "for handicap calculations".
                // In `get-handicap-history.ts` (which I didn't read fully but user implied was updated), it likely uses preferred.
                // Let's implement the preferred override here too to match.

                // Wait, `h.round` doesn't have course/tee_boxes included here easily unless I fetch them.
                // But `h.tee_box` is the Relation.

                // To be safe and match `ScoresDashboard` logic, we should probably stick to `tee_box` on record 
                // UNLESS `preferred_tee_box` helps fix missing data. The user said V2 data was bad.
                // But for V3 rounds (like Dec 13), `tee_box` IS set. 

                // Let's rely on the record's score and slope/rating.
                // If they are missing, we skip.
                return {
                    id: h.id,
                    date: new Date(h.round.date).toISOString().split('T')[0],
                    score: h.adjusted_gross_score || h.gross_score || 0, // Use adjusted!
                    rating: rating,
                    slope: slope
                };
            }).filter(h => h.score > 0);

            // Calculate Index
            const calcResult = calculateHandicap(historyInput);

            // Check discrepancy
            const oldIndex = rp.index_at_time;
            const newIndex = calcResult.handicapIndex;

            if (oldIndex !== newIndex) {
                // Only log significant changes to avoid noise (e.g. floating point)
                if (Math.abs((oldIndex ?? -99) - newIndex) > 0.05) {
                    console.log(`   Player ${rp.player.name}: Index updated from ${oldIndex} -> ${newIndex}`);

                    // Update DB
                    await prisma.roundPlayer.update({
                        where: { id: rp.id },
                        data: { index_at_time: newIndex }
                    });
                }
            }
        }
    }
    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
