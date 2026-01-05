'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * LIVE SCORING ISOLATION
 * ======================
 * This action handles live score updates and is COMPLETELY ISOLATED from handicap calculations.
 * 
 * Key Points:
 * - Live rounds are marked with `is_live: true` and `completed: false`
 * - Handicap recalculation ONLY processes rounds where `completed: true`
 * - Player handicaps and indices are NOT updated during live scoring
 * - Handicaps are ONLY updated when completeRound() is called (via the "Save" button)
 * 
 * This ensures that:
 * 1. Players can score live rounds without affecting their official handicap
 * 2. Scores can be edited/corrected during the round without handicap fluctuations
 * 3. Handicaps are only updated once the round is finalized and verified
 */

/**
 * Saves scores for a specific hole for multiple players in a round.
 * Creates RoundPlayer records and Score records as needed.
 * Updates gross/front/back totals for each player.
 */
export async function saveLiveHoleScores(
    roundId: string,
    holeNumber: number,
    playerScores: Array<{ playerId: string; strokes: number }>
) {
    try {
        // 1. Get the round and course details
        const round = await prisma.round.findUnique({
            where: { id: roundId },
            include: {
                course: {
                    include: {
                        holes: true,
                        tee_boxes: true
                    }
                }
            }
        });

        if (!round) throw new Error('Round not found');

        // Ensure round is marked as INCOMPLETE if we are saving live scores
        if (round.completed) {
            await prisma.round.update({
                where: { id: roundId },
                data: { completed: false }
            });
        }

        const hole = round.course.holes.find(h => h.hole_number === holeNumber);
        if (!hole) throw new Error(`Hole ${holeNumber} not found for this course`);

        // Default tee for any new players added to the round
        const defaultTee = round.course.tee_boxes.find(t => t.name === 'White') || round.course.tee_boxes[0];

        // 2. Process each player's score
        for (const ps of playerScores) {
            // Find or create RoundPlayer
            let roundPlayer = await prisma.roundPlayer.findFirst({
                where: {
                    round_id: roundId,
                    player_id: ps.playerId
                }
            });

            if (!roundPlayer) {
                const player = await prisma.player.findUnique({ where: { id: ps.playerId } });
                const playerTeeBoxName = player?.preferred_tee_box || 'White';
                const teeBox = round.course.tee_boxes.find(t => t.name.toLowerCase() === playerTeeBoxName.toLowerCase()) ||
                    round.course.tee_boxes.find(t => t.name === 'White') ||
                    round.course.tee_boxes[0];

                const handicapIndex = player?.index || 0;
                const courseHandicap = Math.round(handicapIndex * (teeBox.slope / 113));

                roundPlayer = await prisma.roundPlayer.create({
                    data: {
                        round_id: roundId,
                        player_id: ps.playerId,
                        tee_box_id: teeBox.id,
                        tee_box_name: teeBox.name,
                        tee_box_rating: teeBox.rating,
                        tee_box_slope: Math.round(teeBox.slope),
                        tee_box_par: round.course.holes.reduce((sum, h) => sum + h.par, 0),
                        index_at_time: handicapIndex,
                        course_handicap: courseHandicap,
                        gross_score: null
                    }
                });
            } else if (roundPlayer.course_handicap === null) {
                // Backfill snapshot data for existing records if missing
                const player = await prisma.player.findUnique({ where: { id: ps.playerId } });
                const playerTeeBoxName = roundPlayer.tee_box_name || player?.preferred_tee_box || 'White';

                // Try to find by ID first, then name
                let teeBox = round.course.tee_boxes.find(t => t.id === roundPlayer.tee_box_id);
                if (!teeBox) {
                    teeBox = round.course.tee_boxes.find(t => t.name.toLowerCase() === playerTeeBoxName.toLowerCase()) ||
                        round.course.tee_boxes.find(t => t.name === 'White') ||
                        round.course.tee_boxes[0];
                }

                const handicapIndex = roundPlayer.index_at_time || player?.index || 0;
                const courseHandicap = Math.round(handicapIndex * (teeBox.slope / 113));

                await prisma.roundPlayer.update({
                    where: { id: roundPlayer.id },
                    data: {
                        tee_box_id: teeBox.id,
                        tee_box_name: teeBox.name,
                        tee_box_rating: teeBox.rating,
                        tee_box_slope: Math.round(teeBox.slope),
                        index_at_time: handicapIndex,
                        course_handicap: courseHandicap
                    }
                });

                // Update local object to reflect changes for score calculation steps below if needed
                roundPlayer.course_handicap = courseHandicap;
            }


            // Save the hole score
            const existingScore = await prisma.score.findFirst({
                where: {
                    round_player_id: roundPlayer.id,
                    hole_id: hole.id
                }
            });

            if (existingScore) {
                await prisma.score.update({
                    where: { id: existingScore.id },
                    data: { strokes: ps.strokes }
                });
            } else {
                await prisma.score.create({
                    data: {
                        round_player_id: roundPlayer.id,
                        hole_id: hole.id,
                        strokes: ps.strokes
                    }
                });
            }

            // 3. Recalculate summary totals for this player
            const allScores = await prisma.score.findMany({
                where: { round_player_id: roundPlayer.id },
                include: { hole: { select: { hole_number: true } } }
            });

            let gross = 0;
            let front = 0;
            let back = 0;

            allScores.forEach(s => {
                gross += s.strokes;
                if (s.hole.hole_number <= 9) front += s.strokes;
                else back += s.strokes;
            });

            await prisma.roundPlayer.update({
                where: { id: roundPlayer.id },
                data: {
                    gross_score: gross,
                    front_nine: front > 0 ? front : null,
                    back_nine: back > 0 ? back : null
                }
            });
        }

        revalidatePath('/live');
        // revalidatePath('/scores'); // Isolate live scoring from scores page
        // revalidatePath('/players'); // Don't revalidate players page during live scoring to avoid handicap confusion

        return { success: true };
    } catch (error) {
        console.error('Failed to save live scores:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save scores'
        };
    }
}
