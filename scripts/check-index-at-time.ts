
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkIndexAtTime() {
    console.log('Checking index_at_time in round_players...');

    const total = await prisma.roundPlayer.count();
    const nullIndex = await prisma.roundPlayer.count({
        where: { index_at_time: null }
    });

    console.log(`Total RoundPlayers: ${total}`);
    console.log(`RoundPlayers with NULL index_at_time: ${nullIndex}`);

    if (nullIndex > 0) {
        console.log('Sample NULL records:');
        const nulls = await prisma.roundPlayer.findMany({
            where: { index_at_time: null },
            take: 5,
            include: { round: true, player: true }
        });
        nulls.forEach(rp => {
            console.log(`  - ${rp.player.name} on ${rp.round.date}: Index is NULL`);
        });
    }

    console.log('Sample Valid records:');
    const valid = await prisma.roundPlayer.findMany({
        where: { index_at_time: { not: null } },
        take: 5,
        orderBy: { round: { date: 'desc' } },
        include: { round: true, player: true }
    });

    valid.forEach(rp => {
        console.log(`  - ${rp.player.name} on ${rp.round.date}: Index stored: ${rp.index_at_time}, Current Player Index: ${rp.player.handicap_index}`);
    });
}

checkIndexAtTime()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
