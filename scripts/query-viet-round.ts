import { prisma } from '../lib/prisma';

async function queryVietRound() {
    try {
        // Find rounds on 1/7/2026
        const rounds = await prisma.round.findMany({
            where: {
                date: '2026-01-07'
            },
            include: {
                course: {
                    include: {
                        holes: {
                            orderBy: {
                                hole_number: 'asc'
                            }
                        },
                        tee_boxes: true
                    }
                },
                players: {
                    include: {
                        player: true,
                        tee_box: true,
                        scores: {
                            include: {
                                hole: true
                            },
                            orderBy: {
                                hole: {
                                    hole_number: 'asc'
                                }
                            }
                        }
                    }
                }
            }
        });

        console.log('\n=== ROUNDS ON 1/7/2026 ===\n');
        console.log(`Found ${rounds.length} round(s)\n`);

        for (const round of rounds) {
            console.log(`\n📅 Round: ${round.name || 'Unnamed'}`);
            console.log(`   Date: ${round.date}`);
            console.log(`   Course: ${round.course?.holes?.[0] ? 'Course data available' : 'No course data'}`);
            console.log(`   Tournament: ${round.is_tournament ? 'Yes' : 'No'}`);
            console.log(`   Players: ${round.players.length}`);

            // Find Viet in this round
            const vietPlayer = round.players.find(p =>
                p.player?.name?.toLowerCase().includes('viet') ||
                p.player?.email?.toLowerCase().includes('viet')
            );

            if (vietPlayer) {
                console.log('\n🏌️ VIET\'S ROUND DETAILS:');
                console.log('─'.repeat(60));
                console.log(`Player Name: ${vietPlayer.player?.name || 'N/A'}`);
                console.log(`Email: ${vietPlayer.player?.email || 'N/A'}`);
                console.log(`Tee Box: ${vietPlayer.tee_box?.name || 'N/A'}`);
                console.log(`Rating: ${vietPlayer.tee_box?.rating || 'N/A'}`);
                console.log(`Slope: ${vietPlayer.tee_box?.slope || 'N/A'}`);
                console.log(`\nScores:`);
                console.log(`  Gross Score: ${vietPlayer.gross_score || 'Not entered'}`);
                console.log(`  Front Nine: ${vietPlayer.front_nine || 'Not entered'}`);
                console.log(`  Back Nine: ${vietPlayer.back_nine || 'Not entered'}`);
                console.log(`  Index at Time: ${vietPlayer.index_at_time ?? 'N/A'}`);
                console.log(`  Index After: ${vietPlayer.index_after ?? 'N/A'}`);
                console.log(`  Course Handicap: ${vietPlayer.course_handicap ?? 'N/A'}`);
                console.log(`  Points: ${vietPlayer.points || 0}`);
                console.log(`  Payout: $${vietPlayer.payout || 0}`);
                console.log(`  In Pool: ${vietPlayer.in_pool ? 'Yes' : 'No'}`);

                if (vietPlayer.scores && vietPlayer.scores.length > 0) {
                    console.log(`\n📊 HOLE-BY-HOLE SCORES:`);
                    console.log('─'.repeat(60));
                    console.log('Hole | Par | Strokes | Diff');
                    console.log('─'.repeat(60));

                    let totalStrokes = 0;
                    let totalPar = 0;

                    vietPlayer.scores.forEach(score => {
                        const holeNum = score.hole.hole_number;
                        const par = score.hole.par;
                        const strokes = score.strokes;
                        const diff = strokes - par;
                        const diffStr = diff > 0 ? `+${diff}` : diff.toString();

                        console.log(`  ${holeNum.toString().padStart(2)}  |  ${par}  |   ${strokes}     | ${diffStr}`);

                        totalStrokes += strokes;
                        totalPar += par;
                    });

                    console.log('─'.repeat(60));
                    const totalDiff = totalStrokes - totalPar;
                    const totalDiffStr = totalDiff > 0 ? `+${totalDiff}` : totalDiff.toString();
                    console.log(`Total|  ${totalPar} |  ${totalStrokes}    | ${totalDiffStr}`);
                } else {
                    console.log('\n⚠️  No hole-by-hole scores recorded');
                }

                // Calculate net score if we have course handicap
                if (vietPlayer.gross_score && vietPlayer.course_handicap !== null) {
                    const netScore = vietPlayer.gross_score - vietPlayer.course_handicap;
                    console.log(`\n🎯 Net Score: ${netScore} (Gross ${vietPlayer.gross_score} - CH ${vietPlayer.course_handicap})`);
                }
            } else {
                console.log('\n⚠️  Viet not found in this round');
                console.log('\nPlayers in round:');
                round.players.forEach(p => {
                    console.log(`  - ${p.player?.name || 'Unknown'} (${p.player?.email || 'No email'})`);
                });
            }
        }

        if (rounds.length === 0) {
            console.log('⚠️  No rounds found on 1/7/2026');
            console.log('\nSearching for rounds near that date...\n');

            const nearbyRounds = await prisma.round.findMany({
                where: {
                    date: {
                        gte: '2026-01-01',
                        lte: '2026-01-15'
                    }
                },
                select: {
                    id: true,
                    date: true,
                    name: true,
                    players: {
                        select: {
                            player: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                }
            });

            console.log(`Found ${nearbyRounds.length} rounds in early January 2026:`);
            nearbyRounds.forEach(r => {
                const playerNames = r.players.map(p => p.player?.name).join(', ');
                console.log(`  ${r.date} - ${r.name || 'Unnamed'} - Players: ${playerNames}`);
            });
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

queryVietRound();
