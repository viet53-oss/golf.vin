
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Fixing pool defaults...');

    // 1. Get all rounds
    const rounds = await prisma.round.findMany({
        include: {
            players: {
                select: { id: true }
            }
        }
    });

    console.log(`Found ${rounds.length} rounds.`);

    // 2. Identify rounds where NO ONE has in_pool = true
    for (const round of rounds) {
        const playersInPool = await prisma.roundPlayer.count({
            where: {
                round_id: round.id,
                in_pool: true
            }
        });

        if (playersInPool === 0) {
            console.log(`Round ${round.date} (ID: ${round.id}) has 0 players in pool. Defaulting ALL to in_pool=true.`);

            const updateResult = await prisma.roundPlayer.updateMany({
                where: { round_id: round.id },
                data: { in_pool: true }
            });

            console.log(`  -> Updated ${updateResult.count} players to be in the pool.`);
        } else {
            // console.log(`Round ${round.date} already has ${playersInPool} players in pool. Skipping.`);
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
