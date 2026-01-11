'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createCourse(data: {
    name: string,
    tees: { name: string, rating: number, slope: number }[],
    holes: {
        hole_number: number,
        par: number,
        difficulty: number | null,
        latitude?: number | null,
        longitude?: number | null,
        elements?: {
            side: string,
            element_number: number,
            front_latitude?: number | null,
            front_longitude?: number | null,
            back_latitude?: number | null,
            back_longitude?: number | null,
            water?: boolean,
            bunker?: boolean,
            tree?: boolean
        }[]
    }[]
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
                    longitude: h.longitude,
                    elements: h.elements && h.elements.length > 0 ? {
                        create: h.elements.map(e => ({
                            side: e.side,
                            element_number: e.element_number,
                            front_latitude: e.front_latitude,
                            front_longitude: e.front_longitude,
                            back_latitude: e.back_latitude,
                            back_longitude: e.back_longitude,
                            water: e.water || false,
                            bunker: e.bunker || false,
                            tree: e.tree || false
                        }))
                    } : undefined
                }))
            }
        } as any
    });

    revalidatePath('/settings');
    redirect('/settings');
}
