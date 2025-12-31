'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Emergency fix: Reset all low_handicap_index values to null
 * This removes the hard cap that's causing all handicaps to show as 0
 */
export async function resetLowHandicapIndexes() {
    try {
        console.log('🔧 Resetting all low_handicap_index values to null...');

        const result = await prisma.player.updateMany({
            data: {
                low_handicap_index: null
            }
        });

        console.log(`✅ Reset ${result.count} players' low handicap indexes`);

        revalidatePath('/players');
        revalidatePath('/scores');

        return {
            success: true,
            message: `Successfully reset low handicap indexes for ${result.count} players.`
        };

    } catch (error) {
        console.error('Reset failed:', error);
        return {
            success: false,
            message: 'Failed to reset low handicap indexes.'
        };
    }
}
