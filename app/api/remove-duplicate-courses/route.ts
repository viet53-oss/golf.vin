import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        console.log('🧹 Removing duplicate courses...\n');

        // Get all courses
        const allCourses = await prisma.course.findMany({
            include: {
                holes: true,
                teeBoxes: true
            },
            orderBy: {
                createdAt: 'asc' // Keep the oldest one
            }
        });

        console.log(`Found ${allCourses.length} total course entries`);

        // Group by course name
        const coursesByName = new Map<string, typeof allCourses>();

        for (const course of allCourses) {
            if (!coursesByName.has(course.name)) {
                coursesByName.set(course.name, []);
            }
            coursesByName.get(course.name)!.push(course);
        }

        console.log(`\nUnique course names: ${coursesByName.size}`);

        let deletedCount = 0;
        const keptCourses: string[] = [];

        // For each course name, keep the first one and delete the rest
        for (const [name, courses] of coursesByName.entries()) {
            if (courses.length > 1) {
                console.log(`\n📍 ${name}: Found ${courses.length} duplicates`);

                // Keep the first one (oldest)
                const toKeep = courses[0];
                const toDelete = courses.slice(1);

                console.log(`   Keeping: ${toKeep.id} (${toKeep.holes.length} holes, ${toKeep.teeBoxes.length} tee boxes)`);
                keptCourses.push(name);

                // Delete duplicates
                for (const duplicate of toDelete) {
                    console.log(`   Deleting: ${duplicate.id} (${duplicate.holes.length} holes, ${duplicate.teeBoxes.length} tee boxes)`);

                    // Delete related data first (holes and tee boxes will cascade delete)
                    await prisma.course.delete({
                        where: { id: duplicate.id }
                    });

                    deletedCount++;
                }
            } else {
                console.log(`\n✅ ${name}: No duplicates`);
                keptCourses.push(name);
            }
        }

        // Get final count
        const finalCourses = await prisma.course.findMany({
            include: {
                _count: {
                    select: {
                        holes: true,
                        teeBoxes: true
                    }
                }
            }
        });

        console.log(`\n✨ Cleanup complete!`);
        console.log(`   Deleted: ${deletedCount} duplicate courses`);
        console.log(`   Remaining: ${finalCourses.length} unique courses`);

        return NextResponse.json({
            success: true,
            message: `Removed ${deletedCount} duplicate courses`,
            deleted: deletedCount,
            remaining: finalCourses.length,
            courses: finalCourses.map(c => ({
                name: c.name,
                holes: c._count.holes,
                teeBoxes: c._count.teeBoxes
            }))
        });

    } catch (error: any) {
        console.error('Error removing duplicates:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
