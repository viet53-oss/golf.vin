/**
 * Manual Course Data Entry Script
 * 
 * Since we reset the database, we'll need to manually add the courses.
 * This script provides a template for adding the Greater New Orleans golf courses.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Greater New Orleans Golf Courses Data
const coursesData = [
    {
        name: "Bayou Oaks At City Park",
        teeBoxes: [
            { name: "Blue", rating: 72.1, slope: 130, par: 72 },
            { name: "White", rating: 70.5, slope: 125, par: 72 },
            { name: "Red", rating: 68.2, slope: 118, par: 72 },
        ],
        holes: [
            // Front 9
            { number: 1, par: 4 }, { number: 2, par: 4 }, { number: 3, par: 3 },
            { number: 4, par: 5 }, { number: 5, par: 4 }, { number: 6, par: 4 },
            { number: 7, par: 3 }, { number: 8, par: 4 }, { number: 9, par: 5 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 4 }, { number: 12, par: 3 },
            { number: 13, par: 5 }, { number: 14, par: 4 }, { number: 15, par: 4 },
            { number: 16, par: 3 }, { number: 17, par: 4 }, { number: 18, par: 5 },
        ]
    },
    {
        name: "Joseph M. Bartholomew Municipal Golf Course",
        teeBoxes: [
            { name: "Blue", rating: 71.5, slope: 128, par: 72 },
            { name: "White", rating: 69.8, slope: 123, par: 72 },
            { name: "Red", rating: 67.5, slope: 116, par: 72 },
        ],
        holes: [
            // Front 9
            { number: 1, par: 4 }, { number: 2, par: 4 }, { number: 3, par: 3 },
            { number: 4, par: 5 }, { number: 5, par: 4 }, { number: 6, par: 4 },
            { number: 7, par: 3 }, { number: 8, par: 4 }, { number: 9, par: 5 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 4 }, { number: 12, par: 3 },
            { number: 13, par: 5 }, { number: 14, par: 4 }, { number: 15, par: 4 },
            { number: 16, par: 3 }, { number: 17, par: 4 }, { number: 18, par: 5 },
        ]
    },
    {
        name: "Golf Club at Audubon Park",
        teeBoxes: [
            { name: "Blue", rating: 70.2, slope: 125, par: 72 },
            { name: "White", rating: 68.5, slope: 120, par: 72 },
            { name: "Red", rating: 66.8, slope: 115, par: 72 },
        ],
        holes: [
            // Front 9
            { number: 1, par: 4 }, { number: 2, par: 4 }, { number: 3, par: 3 },
            { number: 4, par: 5 }, { number: 5, par: 4 }, { number: 6, par: 4 },
            { number: 7, par: 3 }, { number: 8, par: 4 }, { number: 9, par: 5 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 4 }, { number: 12, par: 3 },
            { number: 13, par: 5 }, { number: 14, par: 4 }, { number: 15, par: 4 },
            { number: 16, par: 3 }, { number: 17, par: 4 }, { number: 18, par: 5 },
        ]
    },
    {
        name: "Stonebridge Golf Club of New Orleans",
        teeBoxes: [
            { name: "Blue", rating: 73.5, slope: 135, par: 72 },
            { name: "White", rating: 71.2, slope: 128, par: 72 },
            { name: "Red", rating: 69.0, slope: 120, par: 72 },
        ],
        holes: [
            // Front 9
            { number: 1, par: 4 }, { number: 2, par: 4 }, { number: 3, par: 3 },
            { number: 4, par: 5 }, { number: 5, par: 4 }, { number: 6, par: 4 },
            { number: 7, par: 3 }, { number: 8, par: 4 }, { number: 9, par: 5 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 4 }, { number: 12, par: 3 },
            { number: 13, par: 5 }, { number: 14, par: 4 }, { number: 15, par: 4 },
            { number: 16, par: 3 }, { number: 17, par: 4 }, { number: 18, par: 5 },
        ]
    },
    {
        name: "English Turn Golf & Country Club",
        teeBoxes: [
            { name: "Blue", rating: 74.2, slope: 138, par: 72 },
            { name: "White", rating: 72.0, slope: 132, par: 72 },
            { name: "Red", rating: 70.5, slope: 125, par: 72 },
        ],
        holes: [
            // Front 9
            { number: 1, par: 4 }, { number: 2, par: 4 }, { number: 3, par: 3 },
            { number: 4, par: 5 }, { number: 5, par: 4 }, { number: 6, par: 4 },
            { number: 7, par: 3 }, { number: 8, par: 4 }, { number: 9, par: 5 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 4 }, { number: 12, par: 3 },
            { number: 13, par: 5 }, { number: 14, par: 4 }, { number: 15, par: 4 },
            { number: 16, par: 3 }, { number: 17, par: 4 }, { number: 18, par: 5 },
        ]
    },
    {
        name: "Timberlane Golf & Recreation",
        teeBoxes: [
            { name: "Blue", rating: 71.8, slope: 127, par: 72 },
            { name: "White", rating: 70.0, slope: 122, par: 72 },
            { name: "Red", rating: 68.5, slope: 117, par: 72 },
        ],
        holes: [
            // Front 9
            { number: 1, par: 4 }, { number: 2, par: 4 }, { number: 3, par: 3 },
            { number: 4, par: 5 }, { number: 5, par: 4 }, { number: 6, par: 4 },
            { number: 7, par: 3 }, { number: 8, par: 4 }, { number: 9, par: 5 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 4 }, { number: 12, par: 3 },
            { number: 13, par: 5 }, { number: 14, par: 4 }, { number: 15, par: 4 },
            { number: 16, par: 3 }, { number: 17, par: 4 }, { number: 18, par: 5 },
        ]
    },
    {
        name: "TPC Louisiana",
        teeBoxes: [
            { name: "Blue", rating: 75.5, slope: 142, par: 72 },
            { name: "White", rating: 73.2, slope: 135, par: 72 },
            { name: "Red", rating: 71.0, slope: 128, par: 72 },
        ],
        holes: [
            // Front 9
            { number: 1, par: 4 }, { number: 2, par: 5 }, { number: 3, par: 4 },
            { number: 4, par: 3 }, { number: 5, par: 4 }, { number: 6, par: 4 },
            { number: 7, par: 5 }, { number: 8, par: 3 }, { number: 9, par: 4 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 5 }, { number: 12, par: 3 },
            { number: 13, par: 4 }, { number: 14, par: 4 }, { number: 15, par: 4 },
            { number: 16, par: 3 }, { number: 17, par: 5 }, { number: 18, par: 4 },
        ]
    },
    {
        name: "Chateau Golf & Country Club",
        teeBoxes: [
            { name: "Blue", rating: 72.5, slope: 130, par: 72 },
            { name: "White", rating: 70.8, slope: 125, par: 72 },
            { name: "Red", rating: 69.2, slope: 120, par: 72 },
        ],
        holes: [
            // Front 9
            { number: 1, par: 4 }, { number: 2, par: 4 }, { number: 3, par: 3 },
            { number: 4, par: 5 }, { number: 5, par: 4 }, { number: 6, par: 4 },
            { number: 7, par: 3 }, { number: 8, par: 4 }, { number: 9, par: 5 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 4 }, { number: 12, par: 3 },
            { number: 13, par: 5 }, { number: 14, par: 4 }, { number: 15, par: 4 },
            { number: 16, par: 3 }, { number: 17, par: 4 }, { number: 18, par: 5 },
        ]
    },
    {
        name: "Grand Ridge Golf Club",
        teeBoxes: [
            { name: "Blue", rating: 71.0, slope: 126, par: 72 },
            { name: "White", rating: 69.5, slope: 121, par: 72 },
            { name: "Red", rating: 67.8, slope: 116, par: 72 },
        ],
        holes: [
            // Front 9
            { number: 1, par: 4 }, { number: 2, par: 4 }, { number: 3, par: 3 },
            { number: 4, par: 5 }, { number: 5, par: 4 }, { number: 6, par: 4 },
            { number: 7, par: 3 }, { number: 8, par: 4 }, { number: 9, par: 5 },
            // Back 9
            { number: 10, par: 4 }, { number: 11, par: 4 }, { number: 12, par: 3 },
            { number: 13, par: 5 }, { number: 14, par: 4 }, { number: 15, par: 4 },
            { number: 16, par: 3 }, { number: 17, par: 4 }, { number: 18, par: 5 },
        ]
    },
];

async function seedCourses() {
    console.log('🏌️ Seeding Greater New Orleans Golf Courses...\n');

    try {
        for (const courseData of coursesData) {
            console.log(`\n📍 Creating: ${courseData.name}`);

            // Create course
            const course = await prisma.course.create({
                data: {
                    name: courseData.name,
                }
            });
            console.log(`   ✅ Course created`);

            // Create tee boxes
            console.log(`   📦 Creating ${courseData.teeBoxes.length} tee boxes...`);
            for (const teeBoxData of courseData.teeBoxes) {
                await prisma.teeBox.create({
                    data: {
                        courseId: course.id,
                        name: teeBoxData.name,
                        rating: teeBoxData.rating,
                        slope: teeBoxData.slope,
                        par: teeBoxData.par,
                    }
                });
                console.log(`      ✅ ${teeBoxData.name} (Rating: ${teeBoxData.rating}, Slope: ${teeBoxData.slope}, Par: ${teeBoxData.par})`);
            }

            // Create holes
            console.log(`   ⛳ Creating ${courseData.holes.length} holes...`);
            for (const holeData of courseData.holes) {
                await prisma.hole.create({
                    data: {
                        courseId: course.id,
                        holeNumber: holeData.number,
                        par: holeData.par,
                    }
                });
            }

            const totalPar = courseData.holes.reduce((sum, hole) => sum + hole.par, 0);
            console.log(`      ✅ All holes created (Total Par: ${totalPar})`);
        }

        console.log('\n✨ All courses seeded successfully!');
        console.log('\n📊 Summary:');
        const totalCourses = await prisma.course.count();
        const totalTeeBoxes = await prisma.teeBox.count();
        const totalHoles = await prisma.hole.count();
        console.log(`   Courses: ${totalCourses}`);
        console.log(`   Tee Boxes: ${totalTeeBoxes}`);
        console.log(`   Holes: ${totalHoles}`);

    } catch (error: any) {
        console.error('❌ Error seeding courses:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed
seedCourses()
    .then(() => {
        console.log('\n✅ Seed completed!');
        console.log('🌐 View in Prisma Studio: http://localhost:5212');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Seed failed:', error);
        process.exit(1);
    });
