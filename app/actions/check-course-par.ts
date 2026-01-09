'use server';

import { prisma } from '@/lib/prisma';

export async function checkCoursePar() {
    try {
        const course = await prisma.course.findFirst({
            where: {
                name: {
                    contains: 'North',
                    mode: 'insensitive'
                }
            },
            include: {
                holes: {
                    orderBy: {
                        hole_number: 'asc'
                    }
                },
                tee_boxes: true
            }
        });

        if (!course) {
            return { success: false, message: 'Course not found' };
        }

        const holes = course.holes.map(h => ({
            hole: h.hole_number,
            par: h.par
        }));

        const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);

        return {
            success: true,
            courseName: course.name,
            totalPar,
            holes,
            teeBoxes: course.tee_boxes.map(t => ({
                name: t.name,
                rating: t.rating,
                slope: t.slope
            }))
        };

    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
