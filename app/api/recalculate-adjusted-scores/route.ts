import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { calculateAdjustedGrossScore, HoleScore } from '@/lib/adjusted-score';

export async function POST() {
    try {
        console.log('Starting adjusted score recalculation...');

        // Get all round players with scores
        const roundPlayers = await prisma.roundPlayer.findMany({
            where: {
                gross_score: { gte: 1 }
            },
            include: {
                scores: {
                    include: {
                        hole: true
                    },
                    orderBy: {
                        hole: { hole_number: 'asc' }
                    }
                },
                tee_box: true,
                player: true,
                round: {
                    include: {
                        course: {
                            include: {
                                holes: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`Found ${roundPlayers.length} rounds to process`);

        let updated = 0;
        let skipped = 0;
        let noChange = 0;
        const results: string[] = [];

        for (const rp of roundPlayers) {
            // Skip if no scores
            if (rp.scores.length === 0) {
                skipped++;
                continue;
            }

            // Calculate course handicap
            const index = rp.index_at_time ?? rp.player.index;
            const slope = rp.tee_box?.slope ?? 113;
            const rating = rp.tee_box?.rating ?? 72;
            const par = rp.round.course.holes.reduce((sum: number, h: any) => sum + h.par, 0);
            const courseHandicap = Math.round(index * (slope / 113) + (rating - par));

            // Prepare hole scores (no difficulty needed for simple Par+2 rule)
            const holeScores: HoleScore[] = rp.scores.map(s => ({
                holeNumber: s.hole.hole_number,
                par: s.hole.par,
                strokes: s.strokes
            }));

            // Calculate adjusted score (simple Par+2 rule)
            const { adjustedGrossScore, adjustedHoles } = calculateAdjustedGrossScore(holeScores);

            // Safety check: adjusted can never be higher than gross
            const finalAdjusted = Math.min(adjustedGrossScore, rp.gross_score!);

            // Always update to fix any incorrect values in database
            await prisma.roundPlayer.update({
                where: { id: rp.id },
                data: { adjusted_gross_score: finalAdjusted }
            });

            const changeType = finalAdjusted === rp.gross_score ? 'No change' : `${adjustedHoles.length} holes adjusted`;
            const msg = `✅ ${rp.player.name} - ${rp.round.date}: Gross ${rp.gross_score} → Adjusted ${finalAdjusted} (${changeType})`;
            console.log(msg);
            results.push(msg);
            updated++;
        }

        console.log(`\nRecalculation complete!`);
        console.log(`  Updated: ${updated}`);
        console.log(`  No change needed: ${noChange}`);
        console.log(`  Skipped: ${skipped}`);

        return NextResponse.json({
            success: true,
            updated,
            noChange,
            skipped,
            total: roundPlayers.length,
            results
        });

    } catch (error) {
        console.error('Error recalculating adjusted scores:', error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
