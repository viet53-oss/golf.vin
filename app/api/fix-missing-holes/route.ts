import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        console.log('🔧 Checking and fixing missing holes...\n');

        const courses = await prisma.course.findMany({
            include: { holes: true }
        });

        let totalCreated = 0;

        for (const course of courses) {
            console.log(`\n📍 Checking ${course.name}...`);
            console.log(`   Current holes: ${course.holes.length}/18`);

            // Get existing hole numbers
            const existingHoleNumbers = course.holes.map(h => h.holeNumber);

            // Find missing holes (1-18)
            const missingHoles = [];
            for (let i = 1; i <= 18; i++) {
                if (!existingHoleNumbers.includes(i)) {
                    missingHoles.push(i);
                }
            }

            if (missingHoles.length > 0) {
                console.log(`   Missing holes: ${missingHoles.join(', ')}`);

                // Create missing holes with default par values
                for (const holeNumber of missingHoles) {
                    // Default par: 4 for most holes, 3 for par 3s, 5 for par 5s
                    // Using a simple pattern: holes 3,7,12,16 = par 3, holes 2,9,13,18 = par 5, rest = par 4
                    let par = 4;
                    if ([3, 7, 12, 16].includes(holeNumber)) par = 3;
                    if ([2, 9, 13, 18].includes(holeNumber)) par = 5;

                    await prisma.hole.create({
                        data: {
                            courseId: course.id,
                            holeNumber: holeNumber,
                            par: par,
                            name: `${course.name} - Hole ${holeNumber}`
                        }
                    });
                    totalCreated++;
                }
                console.log(`   ✅ Created ${missingHoles.length} missing holes`);
            } else {
                console.log(`   ✅ All 18 holes present`);
            }
        }

        console.log(`\n✨ Complete! Created ${totalCreated} missing holes`);

        // Get updated counts
        const finalCounts = await Promise.all(
            courses.map(async (course) => {
                const count = await prisma.hole.count({
                    where: { courseId: course.id }
                });
                return { course: course.name, holes: count };
            })
        );

        return NextResponse.json({
            success: true,
            message: `Created ${totalCreated} missing holes`,
            courseCounts: finalCounts
        });

    } catch (error: any) {
        console.error('Error fixing holes:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
