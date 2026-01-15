
import { prisma } from './lib/prisma';

async function main() {
    const roundId = '8aef822b-7f62-4c1d-973f-7f9f4f14da63';
    console.log(`Checking LiveRound: ${roundId}`);

    const liveRound = await prisma.liveRound.findUnique({
        where: { id: roundId },
        include: {
            players: {
                include: {
                    player: true,
                    scores: {
                        include: {
                            hole: true
                        }
                    }
                }
            }
        }
    });

    if (!liveRound) {
        console.log('LiveRound not found');
        return;
    }

    console.log('Round found:', liveRound.name);
    console.log('Players:', liveRound.players.length);

    for (const p of liveRound.players) {
        console.log('--------------------------------------------------');
        console.log(`ID: ${p.id}`);
        console.log(`PlayerID: ${p.playerId}`);
        console.log(`IsGuest: ${p.isGuest}`);
        console.log(`Has Player Relation: ${!!p.player}`);
        if (p.player) {
            console.log(`Player Name: ${p.player.name}`);
            console.log(`Player ID (from relation): ${p.player.id}`);
        } else {
            console.log(`Guest Name: ${p.guestName}`);
        }
        console.log(`Scores Count: ${p.scores.length}`);
        p.scores.forEach(s => {
            console.log(`  Hole ${s.hole.holeNumber}: ${s.strokes}`);
        });
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
