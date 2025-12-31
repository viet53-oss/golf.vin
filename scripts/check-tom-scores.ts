import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function checkTomScores() {
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
                            include: { hole: true },
                            orderBy: { hole: { hole_number: 'asc' } }
                        }
                    },
                    where: {
                        player: { name: { contains: 'Tom' } }
                    }
                }
            }
        });

        if (!round || round.players.length === 0) {
            console.log('Tom not found in 12/27 round');
            return;
        }

        const tom = round.players[0];
        const par = round.course?.holes.reduce((sum, h) => sum + h.par, 0) || 72;
        const index = tom.index_at_time ?? tom.player.index;
        const slope = tom.tee_box?.slope || 113;
        const rating = tom.tee_box?.rating || par;
        const courseHcp = Math.round((index * (slope / 113)) + (rating - par));

        console.log(`\n=== ${tom.player.name} - 12/27/2025 ===\n`);
        console.log(`Index: ${index}, Slope: ${slope}, Rating: ${rating}`);
        console.log(`Course Handicap: ${courseHcp}`);
        console.log(`Gross Score: ${tom.gross_score}\n`);

        console.log('Hole-by-Hole Scores:\n');
        console.log('Hole | Par | Diff | Strokes | Hcp | Net');
        console.log('-----|-----|------|---------|-----|----');

        let totalStrokes = 0;
        tom.scores.forEach(s => {
            const h = s.hole;
            const diff = h.difficulty || 18;
            const baseStrokes = Math.floor(courseHcp / 18);
            const remainder = courseHcp % 18;
            const extraStroke = diff <= remainder ? 1 : 0;
            const hcpStrokes = baseStrokes + extraStroke;
            const netScore = s.strokes - hcpStrokes;

            totalStrokes += s.strokes;

            console.log(`${h.hole_number.toString().padStart(4)} | ${h.par.toString().padStart(3)} | ${diff.toString().padStart(4)} | ${s.strokes.toString().padStart(7)} | ${hcpStrokes.toString().padStart(3)} | ${netScore.toString().padStart(3)}`);
        });

        console.log('\n' + '-'.repeat(50));
        console.log(`Total Strokes: ${totalStrokes}`);
        console.log(`Database Gross: ${tom.gross_score}`);
        console.log(`Match: ${totalStrokes === tom.gross_score ? 'YES' : 'NO - MISMATCH!'}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTomScores();
