
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verify() {
    console.log('Verifying RoundPlayer data...');

    // Find "Viet Chu" or similar
    const player = await prisma.player.findFirst({
        where: { name: { contains: 'Viet', mode: 'insensitive' } }
    });

    if (!player) {
        console.log('Player not found.');
        return;
    }

    console.log(`Checking rounds for ${player.name}...`);

    const rounds = await prisma.roundPlayer.findMany({
        where: { player_id: player.id },
        include: { round: true },
        orderBy: { round: { date: 'desc' } },
        take: 5
    });

    for (const rp of rounds) {
        console.log(`Date: ${new Date(rp.round.date).toISOString().split('T')[0]}`);
        // @ts-ignore
        console.log(`  Index Before: ${rp.index_at_time}`);
        // @ts-ignore
        console.log(`  Index After:  ${rp.index_after}`);
    }
}

verify()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
