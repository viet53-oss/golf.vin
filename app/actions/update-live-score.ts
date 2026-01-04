'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateLiveScore(
    roundPlayerId: string,
    holeNumber: number,
    strokes: number
) {
    try {
        // Get the round player to find the hole
        const roundPlayer = await prisma.roundPlayer.findUnique({
            where: { id: roundPlayerId },
            include: {
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

        if (!roundPlayer) {
            return { success: false, error: 'Round player not found' };
        }

        // Find the hole
        const hole = roundPlayer.round.course.holes.find(
            h => h.hole_number === holeNumber
        );

        if (!hole) {
            return { success: false, error: 'Hole not found' };
        }

        // Check if score already exists
        const existingScore = await prisma.score.findFirst({
            where: {
                round_player_id: roundPlayerId,
                hole_id: hole.id
            }
        });

        if (existingScore) {
            // Update existing score
            await prisma.score.update({
                where: { id: existingScore.id },
                data: { strokes }
            });
        } else {
            // Create new score
            await prisma.score.create({
                data: {
                    round_player_id: roundPlayerId,
                    hole_id: hole.id,
                    strokes
                }
            });
        }

        // Revalidate the live page to trigger real-time updates
        revalidatePath('/live');

        return { success: true };
    } catch (error) {
        console.error('Failed to update live score:', error);
        return { success: false, error: 'Failed to update score' };
    }
}

export async function saveBulkLiveScores(
    scores: Array<{
        roundPlayerId: string;
        holeNumber: number;
        strokes: number;
    }>
) {
    try {
        // Process all scores
        const results = await Promise.all(
            scores.map(score =>
                updateLiveScore(score.roundPlayerId, score.holeNumber, score.strokes)
            )
        );

        // Check if any failed
        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            return {
                success: false,
                error: `Failed to save ${failed.length} score(s)`
            };
        }

        revalidatePath('/live');
        return { success: true };
    } catch (error) {
        console.error('Failed to save bulk scores:', error);
        return { success: false, error: 'Failed to save scores' };
    }
}
