import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const round = await prisma.round.findFirst({
            include: { players: true }
        });
        if (!round) {
            console.log('No rounds found');
            return;
        }
        console.log('Sample RoundPlayer keys:', Object.keys(round.players[0] || {}));
        console.log('Sample RoundPlayer data:', round.players[0]);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
