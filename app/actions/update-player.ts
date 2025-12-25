
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updatePlayerProfile(formData: FormData) {
    const id = formData.get('id') as string;

    // Extract fields
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const zip = formData.get('zip') as string;
    const birthday = formData.get('birthday') as string;
    const year_joined = formData.get('year_joined') as string;
    const preferred_tee_box = formData.get('preferred_tee_box') as string;

    try {
        await prisma.player.update({
            where: { id },
            data: {
                email: email || null,
                phone: phone || null,
                address: address || null,
                city: city || null,
                state: state || null,
                zip: zip || null,
                birthday: birthday || null,
                year_joined: year_joined || null,
                preferred_tee_box: preferred_tee_box || null,
            },
        });

        revalidatePath('/players');
        return { success: true };
    } catch (error) {
        console.error('Failed to update player:', error);
        return { success: false, error: 'Failed to update profile' };
    }
}
