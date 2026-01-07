'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recalculateAllHandicaps } from './recalculate-handicaps';

/**
 * Copies selected players' scores from a live round to the main club scores
 */
export async function copyLiveToClub(data: {
    liveRoundId: string;
    playerIds: string[]; // Array of LiveRoundPlayer IDs
}) {
    try {
        // Get the live round with all its data
        const liveRound = await prisma.liveRound.findUnique({
            where: { id: data.liveRoundId },
            include: {
                course: {
                    include: {
                        holes: true
                    }
                },
                players: {
                    include: {
                        player: true,
                        tee_box: true,
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
            return { success: false, error: 'Live round not found' };
        }

        // Filter to only selected players
        const selectedPlayers = liveRound.players.filter(p => data.playerIds.includes(p.id));

        if (selectedPlayers.length === 0) {
            return { success: false, error: 'No players selected' };
        }

        // Check if a round already exists for this date and course
        let mainRound = await prisma.round.findFirst({
            where: {
                date: liveRound.date,
                course_id: liveRound.course_id
            }
        });

        // Create main round if it doesn't exist
        if (!mainRound) {
            mainRound = await prisma.round.create({
                data: {
                    date: liveRound.date,
                    course_id: liveRound.course_id,
                    name: liveRound.name,
                    completed: true
                }
            });
        }

        let copiedCount = 0;
        let skippedCount = 0;

        // Copy each selected player's data
        for (const livePlayer of selectedPlayers) {
            // Skip guest players (they don't have a player_id)
            if (livePlayer.is_guest || !livePlayer.player_id) {
                skippedCount++;
                continue;
            }

            // Check if this player already has scores in the main round
            const existingRoundPlayer = await prisma.roundPlayer.findFirst({
                where: {
                    round_id: mainRound.id,
                    player_id: livePlayer.player_id
                }
            });

            if (existingRoundPlayer) {
                skippedCount++;
                continue; // Skip if already exists
            }

            // Create the main round player entry
            const roundPlayer = await prisma.roundPlayer.create({
                data: {
                    round_id: mainRound.id,
                    player_id: livePlayer.player_id,
                    tee_box_id: livePlayer.tee_box_id,
                    tee_box_name: livePlayer.tee_box_name,
                    tee_box_par: livePlayer.tee_box_par,
                    tee_box_rating: livePlayer.tee_box_rating,
                    tee_box_slope: livePlayer.tee_box_slope,
                    course_handicap: livePlayer.course_handicap,
                    index_at_time: livePlayer.index_at_time,
                    gross_score: livePlayer.gross_score,
                    front_nine: livePlayer.front_nine,
                    back_nine: livePlayer.back_nine
                }
            });

            // Copy all hole scores
            for (const liveScore of livePlayer.scores) {
                await prisma.score.create({
                    data: {
                        round_player_id: roundPlayer.id,
                        hole_id: liveScore.hole_id,
                        strokes: liveScore.strokes
                    }
                });
            }

            copiedCount++;
        }

        // Recalculate handicaps after adding new scores
        if (copiedCount > 0) {
            console.log('Recalculating handicaps after copying live scores...');
            await recalculateAllHandicaps();
        }

        revalidatePath('/scores');
        revalidatePath('/players');

        return {
            success: true,
            copiedCount,
            skippedCount,
            message: `Copied ${copiedCount} player(s) to club scores. ${skippedCount > 0 ? `Skipped ${skippedCount} (guests or duplicates).` : ''}${copiedCount > 0 ? ' Handicaps recalculated.' : ''}`
        };
    } catch (error) {
        console.error('Failed to copy live scores to club:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to copy scores'
        };
    }
}
