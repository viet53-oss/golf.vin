import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        console.log('🏌️ Adding City Park South - New Orleans...');

        // Create City Park South course
        const course = await prisma.course.create({
            data: {
                name: "City Park South",
            }
        });

        // Create tee boxes
        const teeBoxes = [
            { name: "White", rating: 68.8, slope: 121, par: 72 },
            { name: "Red", rating: 63.7, slope: 101, par: 72 },
            { name: "Gold", rating: 74.7, slope: 128, par: 72 },
            { name: "Blue", rating: 71.3, slope: 125, par: 72 },
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
            { number: 1, par: 4 }, { number: 2, par: 3 }, { number: 3, par: 5 },
            { number: 4, par: 4 }, { number: 5, par: 5 }, { number: 6, par: 4 },
            { number: 7, par: 3 }, { number: 8, par: 4 }, { number: 9, par: 4 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 5 }, { number: 12, par: 4 },
            { number: 13, par: 4 }, { number: 14, par: 3 }, { number: 15, par: 4 },
            { number: 16, par: 4 }, { number: 17, par: 3 }, { number: 18, par: 5 },
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
            message: 'City Park South added successfully!',
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
