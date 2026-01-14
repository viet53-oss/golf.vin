import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        console.log('🏌️ Adding Audubon Golf - New Orleans...');

        // Create Audubon Golf course
        const course = await prisma.course.create({
            data: {
                name: "Audubon Golf",
            }
        });

        // Create tee boxes
        const teeBoxes = [
            { name: "White", rating: 56.6, slope: 92, par: 62 },
            { name: "Gold", rating: 59.7, slope: 105, par: 62 },
            { name: "Blue", rating: 58.2, slope: 101, par: 62 },
            { name: "Tees", rating: 0.0, slope: 0, par: 62 },
        ];

        for (const teeBox of teeBoxes) {
            await prisma.teeBox.create({
                data: {
                    courseId: course.id,
                    name: teeBox.name,
                    rating: teeBox.rating,
                    slope: teeBox.slope,
                    par: teeBox.par,
                }
            });
        }

        // Create holes
        const holes = [
            // Front 9
            { number: 1, par: 4 }, { number: 2, par: 3 }, { number: 3, par: 4 },
            { number: 4, par: 4 }, { number: 5, par: 3 }, { number: 6, par: 4 },
            { number: 7, par: 4 }, { number: 8, par: 4 }, { number: 9, par: 3 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 3 }, { number: 12, par: 3 },
            { number: 13, par: 3 }, { number: 14, par: 4 }, { number: 15, par: 3 },
            { number: 16, par: 3 }, { number: 17, par: 4 }, { number: 18, par: 3 },
        ];

        for (const hole of holes) {
            await prisma.hole.create({
                data: {
                    courseId: course.id,
                    holeNumber: hole.number,
                    par: hole.par,
                }
            });
        }

        const totalPar = holes.reduce((sum, h) => sum + h.par, 0);

        return NextResponse.json({
            success: true,
            message: 'Audubon Golf added successfully!',
            data: {
                course: course.name,
                teeBoxes: 4,
                holes: 18,
                totalPar,
            }
        });

    } catch (error: any) {
        console.error('Error adding course:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
