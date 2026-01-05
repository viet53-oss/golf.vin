const { prisma } = require('./lib/prisma.ts');

async function checkLiveRounds() {
    try {
        const liveRounds = await prisma.round.findMany({
            where: { is_live: true },
            select: {
                id: true,
                name: true,
                date: true,
                is_live: true,
                completed: true,
                players: {
                    select: {
                        player: { select: { name: true } },
                        gross_score: true
                    }
                }
            }
        });

        console.log('=== LIVE ROUNDS ===');
        console.log(JSON.stringify(liveRounds, null, 2));

        const vietRounds = await prisma.roundPlayer.findMany({
            where: {
                player: { name: 'Viet Chu' }
            },
            select: {
                id: true,
                gross_score: true,
                round: {
                    select: {
                        id: true,
                        name: true,
                        date: true,
                        is_live: true,
                        completed: true
                    }
                }
            },
            orderBy: {
                round: { date: 'desc' }
            },
            take: 5
        });

        console.log('\n=== VIET CHU RECENT ROUNDS ===');
        console.log(JSON.stringify(vietRounds, null, 2));

        const vietPlayer = await prisma.player.findFirst({
            where: { name: 'Viet Chu' },
            select: {
                name: true,
                index: true,
                _count: {
                    select: {
                        rounds: true
                    }
                }
            }
        });

        console.log('\n=== VIET CHU PLAYER DATA ===');
        console.log(JSON.stringify(vietPlayer, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLiveRounds();
