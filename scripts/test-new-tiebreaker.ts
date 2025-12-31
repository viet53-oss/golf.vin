import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function testNewTieBreaker() {
    try {
        const round = await prisma.round.findFirst({
            where: {
                date: {
                    gte: '2025-12-27',
                    lt: '2025-12-28'
                }
            },
            include: {
                course: {
                    include: { holes: true }
                },
                players: {
                    include: {
                        player: true,
                        tee_box: true,
                        scores: {
                            include: { hole: true }
                        }
                    },
                    where: {
                        OR: [
                            { player: { name: { contains: 'Tom' } } },
                            { player: { name: { contains: 'Barry' } } }
                        ]
                    }
                }
            }
        });

        if (!round) {
            console.log('No round found');
            return;
        }

        const par = round.course?.holes.reduce((sum, h) => sum + h.par, 0) || 72;

        console.log('\n=== NEW TIE BREAKER TEST (Using GROSS Scores) ===\n');

        const playerStats = round.players.map(rp => {
            const index = rp.index_at_time ?? rp.player.index;
            const slope = rp.tee_box?.slope || 113;
            const rating = rp.tee_box?.rating || par;
            const courseHcp = Math.round((index * (slope / 113)) + (rating - par));

            // Use GROSS scores for tie breaker
            const grossHoleScores = rp.scores.map(s => {
                const h = s.hole;
                const diff = h.difficulty || 18;
                return {
                    holeNumber: h.hole_number,
                    difficulty: diff,
                    grossScore: s.strokes
                };
            }).sort((a, b) => a.difficulty - b.difficulty);

            const netTotal = (rp.gross_score || 999) - courseHcp;

            return {
                name: rp.player.name,
                gross: rp.gross_score,
                courseHcp,
                netTotal,
                grossHoleScores
            };
        });

        // Sort using new logic
        playerStats.sort((a, b) => {
            if (a.netTotal !== b.netTotal) return a.netTotal - b.netTotal;

            // Tie breaker: Compare GROSS scores on hardest holes
            const aHoles = a.grossHoleScores;
            const bHoles = b.grossHoleScores;

            for (let i = 0; i < Math.min(aHoles.length, bHoles.length); i++) {
                if (aHoles[i].grossScore !== bHoles[i].grossScore) {
                    return aHoles[i].grossScore - bHoles[i].grossScore;
                }
            }
            return 0;
        });

        playerStats.forEach((p, idx) => {
            console.log(`${idx + 1}. ${p.name}`);
            console.log(`   Net: ${p.netTotal} (Gross: ${p.gross}, Hcp: ${p.courseHcp})`);
            console.log('');
        });

        console.log('=== DETAILED TIE BREAKER COMPARISON ===\n');
        const tom = playerStats.find(p => p.name.includes('Tom'));
        const barry = playerStats.find(p => p.name.includes('Barry'));

        if (tom && barry) {
            console.log('Comparing GROSS scores on hardest holes:\n');
            console.log('Hole | Diff | Tom Gross | Barry Gross | Winner');
            console.log('-----|------|-----------|-------------|-------');

            for (let i = 0; i < Math.min(tom.grossHoleScores.length, barry.grossHoleScores.length); i++) {
                const tHole = tom.grossHoleScores[i];
                const bHole = barry.grossHoleScores[i];
                const winner = tHole.grossScore < bHole.grossScore ? 'TOM' :
                    tHole.grossScore > bHole.grossScore ? 'BARRY' : 'TIE';

                console.log(`${tHole.holeNumber.toString().padStart(4)} | ${tHole.difficulty.toString().padStart(4)} | ${tHole.grossScore.toString().padStart(9)} | ${bHole.grossScore.toString().padStart(11)} | ${winner}`);

                if (winner !== 'TIE') {
                    console.log(`\n*** FIRST DIFFERENCE - ${winner} WINS! ***`);
                    break;
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testNewTieBreaker();
