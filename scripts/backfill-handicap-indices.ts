
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { calculateHandicap, HandicapInput } from '../lib/handicap';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function backfillHandicapHistory() {
    console.log('🚀 Starting Handicap History Backfill...');

    // 1. Fetch all players
    const players = await prisma.player.findMany({
        include: {
            rounds: {
                include: { round: true, tee_box: true }
            },
            manual_rounds: true
        }
    });

    console.log(`Found ${players.length} players to process.`);

    for (const player of players) {
        console.log(`\nProcessing ${player.name}...`);

        // 2. Combine and Sort All Rounds Chronologically
        const v3Rounds = player.rounds
            .filter(r => r.tee_box) // Ensure complete data
            .map(r => ({
                type: 'v3',
                date: r.round.date,
                id: r.id,
                score: r.adjusted_gross_score || r.gross_score || 0,
                rating: r.tee_box!.rating,
                slope: r.tee_box!.slope,
                timestamp: new Date(r.round.date).getTime()
            }));

        const v2Rounds = player.manual_rounds.map(r => ({
            type: 'v2',
            date: r.date_played,
            id: r.id,
            differential: r.score_differential,
            timestamp: new Date(r.date_played).getTime()
        }));

        // Sort by Date ASC (Oldest first) for replay
        const allHistory = [...v3Rounds, ...v2Rounds].sort((a, b) => a.timestamp - b.timestamp);

        // 3. Replay History
        let currentHistory: HandicapInput[] = [];

        // We need to keep a running buffer of rounds to calculate the index AT that moment
        // When we are at round N, we use rounds 0..N-1 to calculate the "Index Before"
        // After adding round N, we use rounds 0..N to calculate "Index After"

        for (const round of allHistory) {

            // A. Calculate Index BEFORE this round (using history up to now)
            // Note: calculateHandicap takes care of selecting best 8 of 20, etc.
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
                // Check if update is needed to reduce DB writes
                // We'll just update blindly for safety in this script
                await prisma.roundPlayer.update({
                    where: { id: round.id },
                    data: {
                        index_at_time: indexBefore,
                        index_after: indexAfter
                    }
                });
                // process.stdout.write('.'); // Progress dot
            }
        }
        console.log(`  -> Updated ${v3Rounds.length} rounds.`);

        // Final sanity check: update player's current handicap_index
        const finalStats = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);

        if (Math.abs(finalStats.handicapIndex - player.handicap_index) > 0.1) {
            console.log(`  ⚠️  Mismatch! DB says ${player.handicap_index}, Calc says ${finalStats.handicapIndex}. Updating Player...`);
            await prisma.player.update({
                where: { id: player.id },
                data: { handicap_index: finalStats.handicapIndex }
            });
        }
    }

    console.log('\n✅ Backfill Complete!');
}

// Helper to ensure correct type for calculateHandicap
function convertToHandicapInput(history: any[]): HandicapInput[] {
    return history.map(h => {
        if (h.differential !== undefined) {
            return { id: h.id, date: h.date, differential: h.differential } as HandicapInput;
        } else {
            return { id: h.id, date: h.date, score: h.score, rating: h.rating, slope: h.slope } as HandicapInput;
        }
    });
}

backfillHandicapHistory()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
