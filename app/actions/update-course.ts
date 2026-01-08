'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateCourse(
    courseId: string,
    data: {
        name: string,
        tees: { id?: string, name: string, rating: number, slope: number, yardages?: number[] }[],
        holes: { id?: string, hole_number: number, par: number, difficulty: number | null, latitude?: number | null, longitude?: number | null }[]
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
                data: {
                    par: hole.par,
                    difficulty: hole.difficulty,
                }
            });

            // Use raw SQL for coordinates to bypass Prisma Client validation issues in the dev server cache
            if (hole.latitude !== undefined || hole.longitude !== undefined) {
                await prisma.$executeRaw`UPDATE holes SET latitude = ${hole.latitude}, longitude = ${hole.longitude} WHERE id = ${hole.id}`;
            }
        }
    }

    // 3. Update Tee Boxes
    // Handle updates and creation. Deletion is tricky in this simplified view, usually separate action.
    // For now, we only update existing or create new if passed without ID or with temp ID.
    for (const tee of data.tees) {
        if (tee.id && !tee.id.startsWith('temp-')) {
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

    revalidatePath('/settings');
    revalidatePath(`/settings/course/${courseId}/edit`);
    redirect('/settings');
}

export async function deleteCourse(courseId: string) {
    // 1. Check for rounds
    const roundsCount = await prisma.round.count({
        where: { course_id: courseId }
    });

    const liveRoundsCount = await prisma.liveRound.count({
        where: { course_id: courseId }
    });

    if (roundsCount > 0 || liveRoundsCount > 0) {
        return { success: false, error: `Cannot delete course with ${roundsCount} rounds and ${liveRoundsCount} live rounds associated.` };
    }

    try {
        // 2. Delete dependencies first (Holes, TeeBoxes)
        // Prisma cascade might handle this, but being explicit is safe
        await prisma.hole.deleteMany({ where: { course_id: courseId } });
        await prisma.teeBox.deleteMany({ where: { course_id: courseId } });

        // 3. Delete Course
        await prisma.course.delete({ where: { id: courseId } });

        revalidatePath('/settings');
        return { success: true };
    } catch (e) {
        console.error('Failed to delete course:', e);
        return { success: false, error: 'Failed to delete course' };
    }
}
