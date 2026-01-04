'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
                roundPlayer = await prisma.roundPlayer.create({
                    data: {
                        round_id: roundId,
                        player_id: ps.playerId,
                        tee_box_id: defaultTee?.id,
                        gross_score: null
                    }
                });
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
        revalidatePath('/scores');
        revalidatePath('/players');

        return { success: true };
    } catch (error) {
        console.error('Failed to save live scores:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save scores'
        };
    }
}
