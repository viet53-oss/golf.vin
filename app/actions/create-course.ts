'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createCourse(data: {
    name: string,
    tees: { name: string, rating: number, slope: number }[],
    holes: {
        holeNumber: number,
        par: number,
        difficulty: number | null,
        latitude?: number | null,
        longitude?: number | null,
        /* elements removed */
    }[]
}) {
    await prisma.course.create({
        data: {
            name: data.name,
            teeBoxes: {
                create: data.tees.map(t => ({
                    name: t.name,
                    rating: t.rating,
                    slope: t.slope
                }))
            },
            holes: {
                create: data.holes.map(h => ({
                    holeNumber: h.holeNumber,
                    par: h.par,
                    difficulty: h.difficulty,
                    latitude: h.latitude,
                    longitude: h.longitude,
                    // Elements removed
                }))
            }
        }
    });

    revalidatePath('/settings');
    redirect('/settings');
}
