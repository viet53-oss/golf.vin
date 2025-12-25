import fs from 'fs';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
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
            dbUrl = value.trim().replace(/"/g, ''); // Remove quotes if present
        }
    });
}

if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in environment or .env file.');
    process.exit(1);
}

// 2. Initialize Prisma with Postres Adapter
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 3. Define Types
type RoundWithDetails = Prisma.RoundPlayerGetPayload<{
    include: { round: true; tee_box: true }
}>;

async function main() {
    console.log('🔍 Starting Handicap Verification...');

    try {
        // 1. Find Player (Viet)
        const player = await prisma.player.findFirst({
            where: { name: { contains: 'Viet', mode: 'insensitive' } }
        });

        if (!player) {
            console.error('Player "Viet" not found. Cannot verify.');
            return;
        }

        console.log(`\n👤 Player: ${player.name}`);
        console.log(`   Stored Index: ${player.index}`);
        console.log(`   Low HI: ${player.low_handicap_index ?? 'N/A'}`);

        // 2. Fetch Historical Rounds (HandicapRound)
        const historical = await prisma.handicapRound.findMany({
            where: { player_id: player.id },
        });
        console.log(`\n📚 Historical Records (V2): ${historical.length}`);

        const historicalInputs: HandicapInput[] = historical.map(h => ({
            id: h.id,
            date: h.date_played,
            differential: h.score_differential
        }));

        // 3. Fetch New V3 Rounds (RoundPlayer)
        const v3Rounds = await prisma.roundPlayer.findMany({
            where: {
                player_id: player.id,
                gross_score: { not: null }
            },
            include: {
                round: true,
                tee_box: true
            }
        }) as RoundWithDetails[]; // Explicit cast for TS

        // Filter and Map
        const validV3: RoundWithDetails[] = v3Rounds.filter(r => r.tee_box && r.gross_score !== null);
        console.log(`🆕 New Rounds (V3): ${validV3.length}`); // Should be ~10 based on migration

        const v3Inputs: HandicapInput[] = validV3.map(r => ({
            id: r.id,
            date: r.round.date,
            score: r.gross_score!,
            rating: r.tee_box!.rating,
            slope: r.tee_box!.slope,
            pcc: 0
        }));

        // 4. Combine and Calculate
        const allInputs = [...historicalInputs, ...v3Inputs];
        console.log(`\n🧮 Total Input Rounds: ${allInputs.length}`);

        if (allInputs.length === 0) {
            console.log('No rounds found. calculation skipped.');
            return;
        }

        const start = performance.now();
        const result = calculateHandicap(allInputs, player.low_handicap_index);
        const end = performance.now();

        // 5. Analyze Results
        console.log('------------------------------------------------');
        console.log(`Calculated Index: ${result.handicapIndex}`);
        console.log(`Stored Index:     ${player.index}`);
        console.log(`Calculation Time: ${(end - start).toFixed(2)}ms`);
        console.log('------------------------------------------------');

        if (result.isSoftCapped) console.log('⚠️  Soft Cap Applied');
        if (result.isHardCapped) console.log('🛑 Hard Cap Applied');

        // Display the rounds that contributed to the calculation (Latest 20)
        console.log('\n📅 Recent 20 Differentials (Newest First):');
        result.differentials.slice(0, 20).forEach((d, i) => {
            const isUsed = d.used;
            const icon = isUsed ? '✅' : '  ';
            const dateStr = d.date; // already YYYY-MM-DD
            console.log(`${icon} [${i + 1}] Date: ${dateStr} | Diff: ${d.value.toFixed(1)}`);
        });

        const diff = Math.abs(result.handicapIndex - player.index);
        if (diff < 0.001) {
            console.log('\n✅ SUCCESS: Calculated Index matches Stored Index exactly.');
        } else {
            console.error(`\n❌ MISMATCH: Calculated (${result.handicapIndex}) != Stored (${player.index})`);
            console.error('Possible reasons: Database not updated after last round, or different Low HI used.');
        }
    } catch (err) {
        console.error('An error occurred:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
