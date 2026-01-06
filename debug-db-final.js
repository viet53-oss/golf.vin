const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const course = await prisma.course.findFirst({
            where: { name: { contains: 'City Park North', mode: 'insensitive' } },
            include: { tee_boxes: { orderBy: { rating: 'asc' } } }
        });

        if (course) {
            console.log('COURSE:', course.name);
            console.log('TEES:', course.tee_boxes.map(t => t.name));
            console.log('TEE_IDS:', course.tee_boxes.map(t => t.id));
        }

        const players = await prisma.player.findMany({
            where: { NOT: { preferred_tee_box: null } },
            take: 10,
            select: { name: true, preferred_tee_box: true }
        });
        console.log('PLAYERS:', players);

        const liveRoundCount = await prisma.liveRound.findFirst({
            orderBy: { created_at: 'desc' },
            include: { players: { select: { player_id: true, tee_box_name: true } } }
        });
        console.log('LATEST_LIVE:', liveRoundCount?.name, liveRoundCount?.players);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
