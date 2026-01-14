import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Get a sample of holes to show their current state
        const holes = await prisma.hole.findMany({
            take: 20,
            include: {
                course: true
            },
            orderBy: {
                holeNumber: 'asc'
            }
        });

        // Get total counts
        const totalHoles = await prisma.hole.count();
        const totalCourses = await prisma.course.count();

        // Check if name field exists and has values
        const holesWithNames = await prisma.hole.count({
            where: {
                name: {
                    not: null
                }
            }
        });

        return NextResponse.json({
            totalCourses,
            totalHoles,
            holesWithNames,
            holesWithoutNames: totalHoles - holesWithNames,
            sampleHoles: holes.map(h => ({
                id: h.id,
                courseId: h.courseId,
                courseName: h.course.name,
                holeNumber: h.holeNumber,
                par: h.par,
                name: h.name || 'NULL'
            }))
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
