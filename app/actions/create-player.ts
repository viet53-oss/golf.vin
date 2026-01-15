'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createPlayer(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string | null;
    const phone = formData.get('phone') as string | null;
    const preferredTeeBox = formData.get('preferredTeeBox') as string | null;

    if (!name || name.trim() === '') {
        return { success: false, error: 'Name is required' };
    }

    try {
        await prisma.player.create({
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                // preferred_tee_box removed
                handicapIndex: 0, // was index
                // low_handicap_index removed
            }
        });

        revalidatePath('/players');
        return { success: true };
    } catch (error) {
        console.error('Failed to create player:', error);
        return { success: false, error: 'Failed to create player' };
    }
}
