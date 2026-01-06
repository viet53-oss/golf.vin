'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function syncAllRoundsToPreferredTees() {
    try {
        console.log('🔄 Syncing all rounds to preferred tees...');

        // 1. Fetch all players with preferred tees
        const players = await prisma.player.findMany({
            where: { NOT: { preferred_tee_box: null } },
            select: { id: true, preferred_tee_box: true }
        });

        let updatedCount = 0;

        for (const player of players) {
            if (!player.preferred_tee_box) continue;

            // 2. Find all RoundPlayer records for this player
            // We need the course info too
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
                const course = rp.round.course;
                const tees = course.tee_boxes;

                // Look for matching tee in this course
                let match = tees.find(t => t.name.toLowerCase() === player.preferred_tee_box?.toLowerCase());
                if (!match) {
                    match = tees.find(t => t.name.toLowerCase().includes(player.preferred_tee_box!.toLowerCase()));
                }

                if (match) {
                    // Update main round player record
                    await prisma.roundPlayer.update({
                        where: { id: rp.id },
                        data: {
                            tee_box_id: match.id,
                            tee_box_name: match.name,
                            tee_box_rating: match.rating,
                            tee_box_slope: match.slope
                            // Par is usually course par, handled during recalculation or display
                        }
                    });
                    updatedCount++;
                }
            }

            // 3. Find all LiveRoundPlayer records for this player
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
                const course = lrp.live_round.course;
                const tees = course.tee_boxes;

                let match = tees.find(t => t.name.toLowerCase() === player.preferred_tee_box?.toLowerCase());
                if (!match) {
                    match = tees.find(t => t.name.toLowerCase().includes(player.preferred_tee_box!.toLowerCase()));
                }

                if (match) {
                    const coursePar = course.holes.reduce((sum, h) => sum + h.par, 0);
                    const handicapIndex = lrp.index_at_time || 0;
                    const courseHandicap = Math.round((handicapIndex * (match.slope / 113)) + (match.rating - coursePar));

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
                }
            }
        }

        console.log(`✅ Sync Complete. Updated ${updatedCount} round assignments.`);

        revalidatePath('/scores');
        revalidatePath('/live');
        revalidatePath('/players');

        return { success: true, count: updatedCount };
    } catch (error) {
        console.error('Sync failed:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
