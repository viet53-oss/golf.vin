'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateCourse(
    courseId: string,
    data: {
        name: string,
        tees: { id?: string, name: string, rating: number, slope: number, yardages?: number[] }[],
        holes: { id?: string, hole_number: number, par: number, difficulty: number | null }[]
    }
) {
    // 1. Update Course Name
    await prisma.course.update({
        where: { id: courseId },
        data: { name: data.name }
    });

    // 2. Update Holes
    // We expect 18 holes. Upsert is safe.
    for (const hole of data.holes) {
        if (hole.id) {
            await prisma.hole.update({
                where: { id: hole.id },
                data: { par: hole.par, difficulty: hole.difficulty }
            });
        }
    }

    // 3. Update Tee Boxes
    // Handle updates and creation. Deletion is tricky in this simplified view, usually separate action.
    // For now, we only update existing or create new if passed without ID.
    for (const tee of data.tees) {
        if (tee.id) {
            await prisma.teeBox.update({
                where: { id: tee.id },
                data: { name: tee.name, rating: tee.rating, slope: tee.slope }
            });
        } else {
            await prisma.teeBox.create({
                data: {
                    course_id: courseId,
                    name: tee.name,
                    rating: tee.rating,
                    slope: tee.slope
                }
            });
        }
    }

    revalidatePath(`/settings/course/${courseId}`);
    revalidatePath(`/settings/course/${courseId}/edit`);
    redirect(`/settings/course/${courseId}`);
}
