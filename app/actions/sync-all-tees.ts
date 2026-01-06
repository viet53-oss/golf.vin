'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Maintenance action: Re-assigns every round in the database to match the player's 
 * current "Preferred Tee Box" (White, Gold, etc.) at THAT specific course.
 */
export async function syncAllRoundsToPreferredTees() {
    try {
        console.log('🔄 Syncing all rounds to preferred tees...');

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

            // 2. Main Rounds (Score Page)
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

                // Fine matching logic
                let match = tees.find(t => t.name.toLowerCase() === pref.toLowerCase());
                if (!match) {
                    match = tees.find(t => t.name.toLowerCase().includes(pref.toLowerCase()));
                }

                if (match) {
                    // Update if ID is missing or mismatched, or if cached stats are out of date
                    if (rp.tee_box_id !== match.id || rp.tee_box_rating !== match.rating || rp.tee_box_name !== match.name) {
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
        }

        revalidatePath('/scores');
        revalidatePath('/players');
        revalidatePath('/settings');

        return {
            success: true,
            count: updatedCount,
            message: `Sync complete! Reassigned ${updatedCount} round entries to matching tees based on player preferences. ${skippedCount} players were skipped (no preference set).`
        };
    } catch (error) {
        console.error('Tee Sync failed:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
