const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRounds() {
    try {
        const rounds = await prisma.round.findMany({
            select: { date: true, name: true },
            orderBy: { date: 'desc' },
            take: 10
        });

        console.log('Recent rounds:');
        rounds.forEach(r => console.log(`${r.date} - ${r.name}`));

        const roundsIn2026 = await prisma.round.count({
            where: {
                date: {
                    gte: '2026-01-01'
                }
            }
        });

        console.log(`\nTotal rounds in 2026: ${roundsIn2026}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRounds();
