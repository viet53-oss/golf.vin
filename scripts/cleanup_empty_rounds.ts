
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
    console.log('Cleaning up empty rounds (0 players)...');

    // Find empty rounds first to log them
    const emptyRounds = await prisma.round.findMany({
        where: {
            players: {
                none: {}
            }
        },
        select: { id: true, date: true, name: true }
    });

    console.log(`Found ${emptyRounds.length} empty rounds.`);
    emptyRounds.forEach(r => console.log(` - ${r.date} "${r.name}" (${r.id})`));

    if (emptyRounds.length > 0) {
        const deleteResult = await prisma.round.deleteMany({
            where: {
                players: {
                    none: {}
                }
            }
        });
        console.log(`Deleted ${deleteResult.count} empty rounds.`);
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
