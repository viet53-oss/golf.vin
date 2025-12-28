
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { calculateHandicap, type HandicapInput } from '../lib/handicap';

// 1. Load Environment Variables Manually
const envPath = path.resolve(process.cwd(), '.env');
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl && fs.existsSync(envPath)) {
    console.log('Loading .env file...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && key.trim() === 'DATABASE_URL') {
            dbUrl = value.trim().replace(/"/g, '');
        }
    });
}

if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in environment or .env file.');
    process.exit(1);
}

// 2. Initialize Prisma
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to convert history to inputs
function convertToHandicapInput(history: any[]): HandicapInput[] {
    return history.map(h => {
        if (h.differential !== undefined) {
            return { id: h.id, date: h.date, differential: h.differential } as HandicapInput;
        } else {
            return { id: h.id, date: h.date, score: h.score, rating: h.rating, slope: h.slope } as HandicapInput;
        }
    });
}

async function main() {
    console.log('🚀 Starting Full Handicap Recalculation (Script)...');

    try {
        const players = await prisma.player.findMany({
            include: {
                rounds: {
                    include: { round: true, tee_box: true }
                },
                manual_rounds: true
            }
        });

        console.log(`Found ${players.length} players.`);

        let updatedCount = 0;

        for (const player of players) {
            console.log(`Processing ${player.name}...`);

            // Combine and Sort
            type HistoryItem =
                | { type: 'v3'; date: string; id: string; score: number; rating: number; slope: number; timestamp: number }
                | { type: 'v2'; date: string; id: string; differential: number; timestamp: number };

            const v3Rounds: HistoryItem[] = player.rounds
                .filter((r: any) => r.round && r.tee_box)
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

            // Oldest first
            const allHistory = [...v3Rounds, ...v2Rounds].sort((a, b) => a.timestamp - b.timestamp);

            const currentHistory: HandicapInput[] = [];

            for (const round of allHistory) {
                // A. Calc Before
                const statsBefore = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);
                const indexBefore = statsBefore.handicapIndex;

                // B. Add Round
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

                // C. Calc After
                const statsAfter = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);
                const indexAfter = statsAfter.handicapIndex;

                // D. Update DB (Only V3 rounds have fields for this tracking in this schema, likely)
                // Actually assuming RoundPlayer has index_at_time/index_after
                if (round.type === 'v3') {
                    await prisma.roundPlayer.update({
                        where: { id: round.id },
                        data: {
                            index_at_time: indexBefore,
                            index_after: indexAfter
                        }
                    });
                    updatedCount++;
                }
            }

            // Update Final Index
            const finalStats = calculateHandicap(convertToHandicapInput(currentHistory), player.low_handicap_index);
            await prisma.player.update({
                where: { id: player.id },
                data: { index: finalStats.handicapIndex }
            });
            console.log(`  -> Final Index: ${finalStats.handicapIndex}`);
        }

        console.log(`✅ Recalculation Complete. Updated indices for all players and ${updatedCount} round details.`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
