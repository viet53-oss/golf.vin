import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function checkFullRound() {
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
                    }
                }
            }
        });

        if (!round) {
            console.log('No round found for 12/27/2025');
            return;
        }

        console.log(`\n=== Round: ${round.name || 'Unnamed'} on ${round.date} ===`);
        console.log(`Tournament: ${round.is_tournament}`);
        console.log(`Total Players: ${round.players.length}\n`);

        const par = round.course?.holes.reduce((sum, h) => sum + h.par, 0) || 72;

        // Calculate stats for all players
        const playerStats = round.players.map(rp => {
            const index = rp.index_at_time ?? rp.player.index;
            const slope = rp.tee_box?.slope || 113;
            const rating = rp.tee_box?.rating || par;
            const courseHcp = Math.round((index * (slope / 113)) + (rating - par));

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

            const netTotal = (rp.gross_score || 999) - courseHcp;

            return {
                name: rp.player.name,
                gross: rp.gross_score,
                courseHcp,
                netTotal,
                netHoleScores,
                inPool: rp.in_pool
            };
        });

        // Sort using the same logic as ScoresDashboard
        playerStats.sort((a, b) => {
            // 1. Primary: Net Score
            if (a.netTotal !== b.netTotal) return a.netTotal - b.netTotal;

            // 2. Tie Breaker: Hardest Holes (1, 2, 3...)
            const aHoles = a.netHoleScores;
            const bHoles = b.netHoleScores;

            if (aHoles.length === 0 || bHoles.length === 0) return 0;

            for (let i = 0; i < Math.min(aHoles.length, bHoles.length); i++) {
                if (aHoles[i].netScore !== bHoles[i].netScore) {
                    return aHoles[i].netScore - bHoles[i].netScore;
                }
            }
            return 0;
        });

        console.log('=== LEADERBOARD (Sorted by Net + Tie Breaker) ===\n');
        playerStats.forEach((p, idx) => {
            console.log(`${idx + 1}. ${p.name}`);
            console.log(`   Gross: ${p.gross}, Hcp: ${p.courseHcp}, Net: ${p.netTotal}`);
            console.log(`   In Pool: ${p.inPool}`);

            // Show first 5 hardest holes for tie breaker comparison
            console.log(`   Tie Breaker Holes (by difficulty):`);
            p.netHoleScores.slice(0, 5).forEach(h => {
                console.log(`     Hole ${h.holeNumber} (Diff ${h.difficulty}): ${h.strokes} - ${h.hcpStrokes} = ${h.netScore}`);
            });
            console.log('');
        });

        // Specifically compare Tom and Barry
        const tom = playerStats.find(p => p.name.includes('Tom'));
        const barry = playerStats.find(p => p.name.includes('Barry'));

        if (tom && barry) {
            console.log('\n=== TOM vs BARRY COMPARISON ===\n');
            console.log(`Tom: Net ${tom.netTotal}`);
            console.log(`Barry: Net ${barry.netTotal}`);
            console.log('\nTie Breaker Hole-by-Hole:');

            for (let i = 0; i < Math.min(tom.netHoleScores.length, barry.netHoleScores.length); i++) {
                const tHole = tom.netHoleScores[i];
                const bHole = barry.netHoleScores[i];
                const winner = tHole.netScore < bHole.netScore ? 'TOM' :
                    tHole.netScore > bHole.netScore ? 'BARRY' : 'TIE';
                console.log(`  Hole ${tHole.holeNumber} (Diff ${tHole.difficulty}): Tom ${tHole.netScore} vs Barry ${bHole.netScore} - ${winner}`);

                if (winner !== 'TIE') {
                    console.log(`  *** FIRST DIFFERENCE - ${winner} WINS TIE BREAKER ***`);
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

checkFullRound();
