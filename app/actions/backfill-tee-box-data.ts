'use server';

import { prisma } from '@/lib/prisma';

/**
 * Backfills tee box data (par, rating, slope, name) for all existing round players
 * that are missing this information.
 */
export async function backfillTeeBoxData() {
    try {
        // Get all round players that are missing tee box data
        const roundPlayers = await prisma.roundPlayer.findMany({
            where: {
                OR: [
                    { tee_box_par: null },
                    { tee_box_rating: null },
                    { tee_box_slope: null },
                    { tee_box_name: null }
                ]
            },
            include: {
                tee_box: {
                    include: {
                        course: {
                            include: {
                                holes: true,
                                tee_boxes: true
                            }
                        }
                    }
                },
                round: {
                    include: {
                        course: {
                            include: {
                                holes: true,
                                tee_boxes: true
                            }
                        }
                    }
                }
            }
        });

        let updated = 0;
        let skipped = 0;
        const details: string[] = [];

        for (const rp of roundPlayers) {
            // Get the player to find their preferred tee box
            const player = await prisma.player.findUnique({
                where: { id: rp.player_id }
            });

            // Try to get tee box data - either from the assigned tee box or player's preference
            let teeBox = rp.tee_box;

            // If no tee box assigned, try to find the player's preferred tee box
            if (!teeBox && player?.preferred_tee_box) {
                const course = rp.round.course;
                teeBox = course.tee_boxes.find(
                    (tb: any) => tb.name.toLowerCase() === player.preferred_tee_box!.toLowerCase()
                ) as any;

                // If we found it, we need to get the full tee box with holes for par calculation
                if (teeBox) {
                    const fullTeeBox = await prisma.teeBox.findUnique({
                        where: { id: teeBox.id },
                        include: {
                            course: {
                                include: {
                                    holes: true
                                }
                            }
                        }
                    });
                    if (fullTeeBox) {
                        teeBox = fullTeeBox as any;
                    }
                }
            }

            // If still no tee box, try to get the first available tee box from the course
            if (!teeBox) {
                const course = rp.round.course;
                if (course.tee_boxes && course.tee_boxes.length > 0) {
                    const firstTeeBoxId = course.tee_boxes[0].id;
                    const fullTeeBox = await prisma.teeBox.findUnique({
                        where: { id: firstTeeBoxId },
                        include: {
                            course: {
                                include: {
                                    holes: true
                                }
                            }
                        }
                    });
                    if (fullTeeBox) {
                        teeBox = fullTeeBox as any;
                    }
                }
            }

            if (!teeBox) {
                details.push(`Skipped round player ${rp.id} - no tee box found`);
                skipped++;
                continue;
            }

            // Calculate par from the course holes
            const course = teeBox.course || rp.round.course;
            const coursePar = course.holes.reduce((sum, hole) => sum + hole.par, 0);

            // Update the round player with tee box data
            await prisma.roundPlayer.update({
                where: { id: rp.id },
                data: {
                    tee_box_name: rp.tee_box_name || teeBox.name,
                    tee_box_par: rp.tee_box_par || coursePar,
                    tee_box_rating: rp.tee_box_rating || teeBox.rating,
                    tee_box_slope: rp.tee_box_slope || Math.round(teeBox.slope)
                }
            });

            updated++;
        }

        return {
            success: true,
            message: `Backfill complete! Updated: ${updated}, Skipped: ${skipped}, Total: ${roundPlayers.length}`,
            updated,
            skipped,
            total: roundPlayers.length,
            details
        };

    } catch (error) {
        console.error('Error during backfill:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            error: String(error)
        };
    }
}
