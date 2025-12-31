import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function checkTieBreaker() {
    try {
        // Find the 12/27 round
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
            console.log('No round found for 12/27/2024');
            return;
        }

        console.log(`\n=== Round: ${round.name || 'Unnamed'} on ${round.date} ===\n`);

        const par = round.course?.holes.reduce((sum, h) => sum + h.par, 0) || 72;

        for (const rp of round.players) {
            const index = rp.index_at_time ?? rp.player.index;
            const slope = rp.tee_box?.slope || 113;
            const rating = rp.tee_box?.rating || par;
            const courseHcp = Math.round((index * (slope / 113)) + (rating - par));

            console.log(`\n--- ${rp.player.name} ---`);
            console.log(`Index: ${index}, Slope: ${slope}, Rating: ${rating}`);
            console.log(`Course Handicap: ${courseHcp}`);
            console.log(`Gross Score: ${rp.gross_score}`);
            console.log(`In Pool: ${rp.in_pool}`);

            // Calculate net hole scores for tie breaker
            const netHoleScores = rp.scores.map(s => {
                const h = s.hole;
                const diff = h.difficulty || 18;
                const baseStrokes = Math.floor(courseHcp / 18);
                const remainder = courseHcp % 18;
                const extraStroke = diff <= remainder ? 1 : 0;
                const hcpStrokes = baseStrokes + extraStroke;
                return {
                    holeNumber: h.hole_number,
                    difficulty: diff,
                    strokes: s.strokes,
                    hcpStrokes,
                    netScore: s.strokes - hcpStrokes
                };
            }).sort((a, b) => a.difficulty - b.difficulty);

            // Calculate front/back
            const frontScores = netHoleScores.filter(h => h.holeNumber <= 9);
            const backScores = netHoleScores.filter(h => h.holeNumber > 9);

            const frontGross = frontScores.reduce((sum, s) => sum + s.strokes, 0);
            const backGross = backScores.reduce((sum, s) => sum + s.strokes, 0);
            const frontHcp = frontScores.reduce((sum, s) => sum + s.hcpStrokes, 0);
            const backHcp = backScores.reduce((sum, s) => sum + s.hcpStrokes, 0);
            const totalNet = (rp.gross_score ?? 0) - courseHcp;

            console.log(`\nFront 9: ${frontGross} - ${frontHcp} = ${frontGross - frontHcp}`);
            console.log(`Back 9: ${backGross} - ${backHcp} = ${backGross - backHcp}`);
            console.log(`Total: ${rp.gross_score ?? 0} - ${courseHcp} = ${totalNet}`);

            console.log(`\nNet Hole Scores (sorted by difficulty):`);
            netHoleScores.forEach(h => {
                console.log(`  Hole ${h.holeNumber} (Diff ${h.difficulty}): ${h.strokes} - ${h.hcpStrokes} = ${h.netScore}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTieBreaker();
