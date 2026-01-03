'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function addManualScore(formData: FormData) {
    const playerId = formData.get('playerId') as string;
    const datePlayed = formData.get('datePlayed') as string;
    const grossScore = formData.get('grossScore') as string;
    const adjustedGrossScore = formData.get('adjustedGrossScore') as string;

    if (!playerId || !datePlayed || !grossScore || !adjustedGrossScore) {
        return { success: false, error: 'All fields are required' };
    }

    try {
        // Get player's preferred tee box
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            select: { preferred_tee_box: true }
        });

        // Get course and tee box info
        const course = await prisma.course.findFirst({
            include: {
                tee_boxes: true
            }
        });

        if (!course) {
            return { success: false, error: 'Course not found' };
        }

        const preferredTee = player?.preferred_tee_box || 'White';
        const teeBox = course.tee_boxes.find(t => t.name === preferredTee);

        if (!teeBox) {
            return { success: false, error: 'Tee box not found' };
        }

        // Calculate score differential: (Adjusted Gross Score - Course Rating) × (113 / Slope Rating)
        const scoreDifferential = (parseFloat(adjustedGrossScore) - teeBox.rating) * (113 / teeBox.slope);

        await prisma.handicapRound.create({
            data: {
                player_id: playerId,
                date_played: datePlayed, // Already in YYYY-MM-DD format from input
                gross_score: parseInt(grossScore),
                score_differential: parseFloat(scoreDifferential.toFixed(1))
            }
        });

        revalidatePath('/players');
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to add manual score:', error);
        return { success: false, error: 'Failed to add manual score' };
    }
}
