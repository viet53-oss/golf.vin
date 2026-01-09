'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recalculateAllHandicaps } from './recalculate-handicaps';

/**
 * Completes a live round by copying it to the main Round table and deleting from LiveRound
 */
export async function completeLiveRound(liveRoundId: string) {
    try {
        console.log(`🏁 Completing live round ${liveRoundId}...`);

        // 1. Get the live round with all data
        const liveRound = await prisma.liveRound.findUnique({
            where: { id: liveRoundId },
            include: {
                players: {
                    include: {
                        scores: {
                            include: {
                                hole: true
                            }
                        }
                    }
                }
            }
        });

        if (!liveRound) {
            throw new Error('Live round not found');
        }

        // 2. Create a new Round in the main table
        const newRound = await prisma.round.create({
            data: {
                date: liveRound.date,
                name: liveRound.name,
                course_id: liveRound.course_id,
                course_name: liveRound.course_name,
                completed: true,
                is_live: false,
                is_tournament: false
            }
        });

        // 3. Copy all players and their scores (excluding guests)
        for (const livePlayer of liveRound.players) {
            // Skip guest players as they don't have a permanent profile history
            if (livePlayer.is_guest || !livePlayer.player_id) {
                continue;
            }

            // Create RoundPlayer
            const roundPlayer = await prisma.roundPlayer.create({
                data: {
                    round_id: newRound.id,
                    player_id: livePlayer.player_id,
                    tee_box_id: livePlayer.tee_box_id,
                    tee_box_name: livePlayer.tee_box_name,
                    tee_box_rating: livePlayer.tee_box_rating,
                    tee_box_slope: livePlayer.tee_box_slope,
                    tee_box_par: livePlayer.tee_box_par,
                    course_handicap: livePlayer.course_handicap,
                    index_at_time: livePlayer.index_at_time,
                    gross_score: livePlayer.gross_score,
                    front_nine: livePlayer.front_nine,
                    back_nine: livePlayer.back_nine
                }
            });

            // Copy all scores
            for (const liveScore of livePlayer.scores) {
                await prisma.score.create({
                    data: {
                        round_player_id: roundPlayer.id,
                        hole_id: liveScore.hole_id,
                        strokes: liveScore.strokes
                    }
                });
            }
        }

        // 4. Delete the live round (cascade will delete players and scores)
        await prisma.liveRound.delete({
            where: { id: liveRoundId }
        });

        // 5. Recalculate handicaps now that we have a new completed round
        await recalculateAllHandicaps();

        // 6. Revalidate pages
        revalidatePath('/live');
        revalidatePath('/scores');
        revalidatePath('/players');

        console.log(`✅ Live round completed and moved to main rounds table.`);
        return { success: true, roundId: newRound.id };
    } catch (error) {
        console.error('Failed to complete live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to complete round'
        };
    }
}
