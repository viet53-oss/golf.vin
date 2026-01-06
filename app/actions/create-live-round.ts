'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Creates a new live round in the LiveRound table (completely isolated from main rounds)
 */
export async function createLiveRound(data: {
    name: string;
    date: string;
    courseId: string;
    par?: number;
    rating?: number;
    slope?: number;
}) {
    try {
        const liveRound = await prisma.liveRound.create({
            data: {
                name: data.name,
                date: data.date,
                course_id: data.courseId,
                par: data.par ?? 72,
                rating: data.rating ?? 72.0,
                slope: data.slope ?? 113
            } as any
        });

        // revalidatePath('/live'); // Removing to prevent client-side state loss during modal save
        return { success: true, liveRoundId: liveRound.id };
    } catch (error) {
        console.error('Failed to create live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create live round'
        };
    }
}

/**
 * Updates an existing live round metadata
 */
export async function updateLiveRound(data: {
    id: string;
    name: string;
    date: string;
    par: number;
    rating: number;
    slope: number;
}) {
    try {
        const liveRound = await prisma.liveRound.update({
            where: { id: data.id },
            data: {
                name: data.name,
                date: data.date,
                par: data.par,
                rating: data.rating,
                slope: data.slope
            } as any,
            include: {
                players: true
            }
        }) as any;

        // Update all players in this round to match the new course data for accurate handicap/net calculation
        // They keep their own handicap indexes, but recalculate course handicap based on new slope/rating/par
        for (const player of liveRound.players) {
            const courseHandicap = Math.round((player.index_at_time * (data.slope / 113)) + (data.rating - data.par));
            await prisma.liveRoundPlayer.update({
                where: { id: player.id },
                data: {
                    tee_box_rating: data.rating,
                    tee_box_slope: data.slope,
                    tee_box_par: data.par,
                    course_handicap: courseHandicap
                }
            });
        }

        // revalidatePath('/live');
        return { success: true };
    } catch (error) {
        console.error('Failed to update live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update live round'
        };
    }
}

/**
 * Adds a player to a live round
 */
export async function addPlayerToLiveRound(data: {
    liveRoundId: string;
    playerId: string;
    teeBoxId: string;
}) {
    try {
        // Get player and tee box data
        const player = await prisma.player.findUnique({
            where: { id: data.playerId }
        });

        const teeBox = await prisma.teeBox.findUnique({
            where: { id: data.teeBoxId },
            include: {
                course: {
                    include: {
                        holes: true
                    }
                }
            }
        });

        if (!player || !teeBox) {
            throw new Error('Player or tee box not found');
        }

        // Calculate course handicap
        const handicapIndex = player.index || 0;
        const par = teeBox.course.holes.reduce((sum, h) => sum + h.par, 0);

        // Create live round player
        const liveRoundPlayer = await prisma.liveRoundPlayer.create({
            data: {
                live_round_id: data.liveRoundId,
                player_id: data.playerId,
                tee_box_id: data.teeBoxId,
                tee_box_name: teeBox.name,
                tee_box_rating: teeBox.rating,
                tee_box_slope: Math.round(teeBox.slope),
                tee_box_par: par,
                index_at_time: handicapIndex,
                course_handicap: Math.round((handicapIndex * (teeBox.slope / 113)) + (teeBox.rating - par))
            }
        });

        revalidatePath('/live');
        return { success: true, liveRoundPlayerId: liveRoundPlayer.id };
    } catch (error) {
        console.error('Failed to add player to live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add player'
        };
    }
}

/**
 * Adds a guest player to a live round
 */
export async function addGuestToLiveRound(data: {
    liveRoundId: string;
    guestName: string;
    index: number;
    courseHandicap: number;
    rating: number;
    slope: number;
    par: number;
}) {
    try {
        // Create guest player in live round
        const guestPlayer = await prisma.liveRoundPlayer.create({
            data: {
                live_round_id: data.liveRoundId,
                is_guest: true,
                guest_name: data.guestName,
                player_id: null,
                tee_box_id: null,
                tee_box_name: 'Guest',
                tee_box_rating: data.rating,
                tee_box_slope: data.slope,
                tee_box_par: data.par,
                index_at_time: data.index,
                course_handicap: data.courseHandicap
            }
        });

        revalidatePath('/live');
        return { success: true, guestPlayerId: guestPlayer.id };
    } catch (error) {
        console.error('Failed to add guest to live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add guest'
        };
    }
}

/**
 * Updates a guest player in a live round
 */
export async function updateGuestInLiveRound(data: {
    guestPlayerId: string;
    guestName: string;
    index: number;
    courseHandicap: number;
}) {
    try {
        await prisma.liveRoundPlayer.update({
            where: { id: data.guestPlayerId },
            data: {
                guest_name: data.guestName,
                index_at_time: data.index,
                course_handicap: data.courseHandicap
            }
        });

        revalidatePath('/live');
        return { success: true };
    } catch (error) {
        console.error('Failed to update guest:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update guest'
        };
    }
}

/**
 * Deletes a guest player from a live round
 */
export async function deleteGuestFromLiveRound(guestPlayerId: string) {
    try {
        await prisma.liveRoundPlayer.delete({
            where: { id: guestPlayerId }
        });

        revalidatePath('/live');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete guest:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete guest'
        };
    }
}

/**
 * Saves a score for a specific hole in a live round
 */
export async function saveLiveScore(data: {
    liveRoundId: string;
    holeNumber: number;
    playerScores: Array<{ playerId: string; strokes: number }>;
}) {
    try {
        // Get the live round with course and holes
        const liveRound = await prisma.liveRound.findUnique({
            where: { id: data.liveRoundId },
            include: {
                course: {
                    include: {
                        holes: true
                    }
                }
            }
        });

        if (!liveRound) {
            throw new Error('Live round not found');
        }

        const hole = liveRound.course.holes.find(h => h.hole_number === data.holeNumber);
        if (!hole) {
            throw new Error(`Hole ${data.holeNumber} not found`);
        }

        // Save scores for each player
        for (const ps of data.playerScores) {
            // Find the live round player
            const liveRoundPlayer = await prisma.liveRoundPlayer.findFirst({
                where: {
                    live_round_id: data.liveRoundId,
                    player_id: ps.playerId
                }
            });

            if (!liveRoundPlayer) {
                console.warn(`Player ${ps.playerId} not found in live round`);
                continue;
            }

            // Save or update the score
            const existingScore = await prisma.liveScore.findFirst({
                where: {
                    live_round_player_id: liveRoundPlayer.id,
                    hole_id: hole.id
                }
            });

            if (existingScore) {
                await prisma.liveScore.update({
                    where: { id: existingScore.id },
                    data: { strokes: ps.strokes }
                });
            } else {
                await prisma.liveScore.create({
                    data: {
                        live_round_player_id: liveRoundPlayer.id,
                        hole_id: hole.id,
                        strokes: ps.strokes
                    }
                });
            }

            // Recalculate totals
            const allScores = await prisma.liveScore.findMany({
                where: { live_round_player_id: liveRoundPlayer.id },
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

            await prisma.liveRoundPlayer.update({
                where: { id: liveRoundPlayer.id },
                data: {
                    gross_score: gross,
                    front_nine: front > 0 ? front : null,
                    back_nine: back > 0 ? back : null
                }
            });
        }

        revalidatePath('/live');
        return { success: true };
    } catch (error) {
        console.error('Failed to save live score:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save score'
        };
    }
}

/**
 * Deletes a live round
 */
export async function deleteLiveRound(liveRoundId: string) {
    try {
        await prisma.liveRound.delete({
            where: { id: liveRoundId }
        });

        revalidatePath('/live');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete round'
        };
    }
}

/**
 * Gets all live rounds for selection dropdown
 */
export async function getAllLiveRounds() {
    try {
        const rounds = await prisma.liveRound.findMany({
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                name: true,
                date: true,
                created_at: true
            }
        });

        return { success: true, rounds };
    } catch (error) {
        console.error('Failed to get live rounds:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get rounds',
            rounds: []
        };
    }
}
