'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function syncAllRoundsToPreferredTees() {
    try {
        console.log('🔄 Syncing all rounds to preferred tees...');
        const log: string[] = [];

        // 1. Fetch all players
        const players = await prisma.player.findMany({
            select: { id: true, name: true, preferred_tee_box: true }
        });

        let updatedCount = 0;
        let skippedCount = 0;

        for (const player of players) {
            const pref = player.preferred_tee_box?.trim();
            if (!pref) {
                skippedCount++;
                continue;
            }

            // 2. Main Rounds
            const roundPlayers = await prisma.roundPlayer.findMany({
                where: { player_id: player.id },
                include: {
                    round: {
                        include: {
                            course: {
                                include: { tee_boxes: true }
                            }
                        }
                    }
                }
            });

            for (const rp of roundPlayers) {
                const tees = rp.round.course.tee_boxes;
                let match = tees.find(t => t.name.toLowerCase() === pref.toLowerCase());
                if (!match) {
                    match = tees.find(t => t.name.toLowerCase().includes(pref.toLowerCase()));
                }

                if (match) {
                    // Force update if ID is mismatch OR if cached rating/slope info is different
                    if (rp.tee_box_id !== match.id || rp.tee_box_name !== match.name || rp.tee_box_rating !== match.rating) {
                        await prisma.roundPlayer.update({
                            where: { id: rp.id },
                            data: {
                                tee_box_id: match.id,
                                tee_box_name: match.name,
                                tee_box_rating: match.rating,
                                tee_box_slope: match.slope
                            }
                        });
                        updatedCount++;
                    }
                }
            }

            // 3. Live Rounds
            const liveRoundPlayers = await prisma.liveRoundPlayer.findMany({
                where: { player_id: player.id },
                include: {
                    live_round: {
                        include: {
                            course: {
                                include: { tee_boxes: true, holes: true }
                            }
                        }
                    }
                }
            });

            for (const lrp of liveRoundPlayers) {
                const tees = lrp.live_round.course.tee_boxes;
                let match = tees.find(t => t.name.toLowerCase() === pref.toLowerCase());
                if (!match) {
                    match = tees.find(t => t.name.toLowerCase().includes(pref.toLowerCase()));
                }

                if (match) {
                    const coursePar = lrp.live_round.course.holes.reduce((sum, h) => sum + h.par, 0);
                    const handicapIndex = lrp.index_at_time || 0;
                    const courseHandicap = Math.round((handicapIndex * (match.slope / 113)) + (match.rating - coursePar));

                    // Only update if something changed
                    if (lrp.tee_box_id !== match.id || lrp.course_handicap !== courseHandicap || lrp.tee_box_name !== match.name) {
                        await prisma.liveRoundPlayer.update({
                            where: { id: lrp.id },
                            data: {
                                tee_box_id: match.id,
                                tee_box_name: match.name,
                                tee_box_rating: match.rating,
                                tee_box_slope: match.slope,
                                tee_box_par: coursePar,
                                course_handicap: courseHandicap
                            }
                        });
                        updatedCount++;
                    }
                }
            }
        }

        revalidatePath('/scores');
        revalidatePath('/live');
        return {
            success: true,
            count: updatedCount,
            message: `Sync complete! Reassigned ${updatedCount} round entries to matching tees. ${skippedCount} players had no preferred tee set.`
        };
    } catch (error) {
        console.error('Sync failed:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
