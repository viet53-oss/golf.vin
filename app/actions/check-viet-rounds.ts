'use server';

import { prisma } from '@/lib/prisma';

/**
 * Diagnostic: Check what tee box data is saved for Viet's recent rounds
 */
export async function checkVietRounds() {
    try {
        // Find Viet
        const viet = await prisma.player.findFirst({
            where: {
                name: {
                    contains: 'Viet',
                    mode: 'insensitive'
                }
            }
        });

        if (!viet) {
            return { success: false, message: 'Viet not found' };
        }

        // Get Viet's recent rounds
        const rounds = await prisma.roundPlayer.findMany({
            where: {
                player_id: viet.id
            },
            include: {
                round: true,
                tee_box: true
            },
            orderBy: {
                round: {
                    date: 'desc'
                }
            },
            take: 10
        });

        const details = rounds.map(r => ({
            date: r.round.date,
            gross: r.gross_score,
            // Saved data
            saved_name: r.tee_box_name,
            saved_par: r.tee_box_par,
            saved_rating: r.tee_box_rating,
            saved_slope: r.tee_box_slope,
            // Current tee box
            current_name: r.tee_box?.name,
            current_rating: r.tee_box?.rating,
            current_slope: r.tee_box?.slope,
            // Indices
            index_before: r.index_at_time,
            index_after: r.index_after
        }));

        return {
            success: true,
            player: {
                name: viet.name,
                current_index: viet.index,
                low_index: viet.low_handicap_index,
                preferred_tee: viet.preferred_tee_box
            },
            rounds: details
        };

    } catch (error) {
        console.error('Error checking rounds:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            error: String(error)
        };
    }
}
