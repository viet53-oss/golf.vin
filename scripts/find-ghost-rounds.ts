import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function findGhostRounds() {
    const playerName = 'Charlie';
    console.log(`🔎 Searching rounds for player: ${playerName}...`);

    const player = await prisma.player.findFirst({
        where: { name: { contains: playerName } },
        include: {
            rounds: {
                include: { round: true }
            },
            manual_rounds: true
        }
    });

    if (!player) {
        console.log('Player not found');
        return;
    }

    console.log(`Found player: ${player.name}`);

    // Sort all rounds
    const v3 = player.rounds.map(r => ({ type: 'V3', date: r.round.date, id: r.id, score: r.gross_score }));
    const v2 = player.manual_rounds.map(r => ({ type: 'V2', date: r.date_played, id: r.id, diff: r.score_differential }));

    const all = [...v3, ...v2].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('--- Rounds on 2025-08-31 ---');
    const target = all.filter(r => r.date.includes('2025-08-31'));
    target.forEach((r: any) => {
        console.log(`${r.date} | ${r.type} | ID: ${r.id} | ${r.score ? 'Score: ' + r.score : 'Diff: ' + r.diff}`);
    });
}

findGhostRounds()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
