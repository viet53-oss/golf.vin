'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createCourse(data: {
    name: string,
    tees: { name: string, rating: number, slope: number }[],
    holes: { hole_number: number, par: number, difficulty: number | null, latitude?: number | null, longitude?: number | null }[]
}) {
    await prisma.course.create({
        data: {
            name: data.name,
            tee_boxes: {
                create: data.tees.map(t => ({
                    name: t.name,
                    rating: t.rating,
                    slope: t.slope
                }))
            },
            holes: {
                create: data.holes.map(h => ({
                    hole_number: h.hole_number,
                    par: h.par,
                    difficulty: h.difficulty,
                    latitude: h.latitude,
                    longitude: h.longitude
                }))
            }
        }
    });

    revalidatePath('/settings');
    redirect('/settings');
}
