/**
 * Data Migration Script: Copy Course Data from Old Schema to New Schema
 * 
 * This script:
 * 1. Reads data from the old database structure (snake_case)
 * 2. Transforms it to the new structure (camelCase)
 * 3. Inserts it into the new database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OldCourse {
    id: string;
    name: string;
    created_at: Date;
}

interface OldTeeBox {
    id: string;
    course_id: string;
    name: string;
    rating: number;
    slope: number;
    yardages?: number[];
}

interface OldHole {
    id: string;
    course_id: string;
    hole_number: number;
    par: number;
    difficulty?: number;
    latitude?: number;
    longitude?: number;
}

async function migrateCourseData() {
    console.log('🚀 Starting course data migration...\n');

    try {
        // First, let's check what data exists in the current database
        console.log('📊 Checking current database...');

        const existingCourses = await prisma.$queryRaw<any[]>`
      SELECT * FROM courses
    `;

        console.log(`Found ${existingCourses.length} courses in database\n`);

        if (existingCourses.length === 0) {
            console.log('⚠️  No courses found. The database might already be empty.');
            console.log('Let me check if there are any tables with the old schema...\n');

            // Try to query with old field names
            try {
                const oldCourses = await prisma.$queryRaw<OldCourse[]>`
          SELECT id, name, created_at FROM courses
        `;

                if (oldCourses.length > 0) {
                    console.log(`✅ Found ${oldCourses.length} courses with old schema!`);
                    console.log('📝 Courses found:');
                    oldCourses.forEach((course, i) => {
                        console.log(`   ${i + 1}. ${course.name}`);
                    });
                    console.log('');

                    // Migrate courses
                    for (const oldCourse of oldCourses) {
                        console.log(`\n📍 Migrating: ${oldCourse.name}`);

                        // Create course with new schema
                        const newCourse = await prisma.course.create({
                            data: {
                                id: oldCourse.id,
                                name: oldCourse.name,
                                createdAt: oldCourse.created_at,
                            }
                        });
                        console.log(`   ✅ Course created`);

                        // Get tee boxes for this course
                        const oldTeeBoxes = await prisma.$queryRaw<OldTeeBox[]>`
              SELECT id, course_id, name, rating, slope, yardages
              FROM tee_boxes
              WHERE course_id = ${oldCourse.id}
            `;

                        console.log(`   📦 Found ${oldTeeBoxes.length} tee boxes`);

                        // Migrate tee boxes
                        for (const oldTeeBox of oldTeeBoxes) {
                            // Calculate par (default to 72 if not available)
                            const par = 72; // You can adjust this based on your data

                            await prisma.teeBox.create({
                                data: {
                                    id: oldTeeBox.id,
                                    courseId: oldTeeBox.course_id,
                                    name: oldTeeBox.name,
                                    rating: oldTeeBox.rating,
                                    slope: Math.round(oldTeeBox.slope),
                                    par: par,
                                    createdAt: new Date(),
                                }
                            });
                            console.log(`      ✅ Tee box: ${oldTeeBox.name} (Rating: ${oldTeeBox.rating}, Slope: ${oldTeeBox.slope})`);
                        }

                        // Get holes for this course
                        const oldHoles = await prisma.$queryRaw<OldHole[]>`
              SELECT id, course_id, hole_number, par, difficulty, latitude, longitude
              FROM holes
              WHERE course_id = ${oldCourse.id}
              ORDER BY hole_number
            `;

                        console.log(`   ⛳ Found ${oldHoles.length} holes`);

                        // Migrate holes
                        for (const oldHole of oldHoles) {
                            await prisma.hole.create({
                                data: {
                                    id: oldHole.id,
                                    courseId: oldHole.course_id,
                                    holeNumber: oldHole.hole_number,
                                    par: oldHole.par,
                                    latitude: oldHole.latitude,
                                    longitude: oldHole.longitude,
                                }
                            });
                        }

                        if (oldHoles.length > 0) {
                            const totalPar = oldHoles.reduce((sum, hole) => sum + hole.par, 0);
                            console.log(`      ✅ All holes migrated (Total Par: ${totalPar})`);
                        }
                    }

                    console.log('\n✨ Migration completed successfully!');
                    console.log('\n📊 Summary:');
                    console.log(`   Courses migrated: ${oldCourses.length}`);

                    const totalTeeBoxes = await prisma.teeBox.count();
                    const totalHoles = await prisma.hole.count();
                    console.log(`   Tee boxes created: ${totalTeeBoxes}`);
                    console.log(`   Holes created: ${totalHoles}`);

                } else {
                    console.log('ℹ️  Database is empty. No data to migrate.');
                }
            } catch (error: any) {
                console.log('ℹ️  Could not find old schema data.');
                console.log('   This is normal if the database was already reset.');
                console.log('\n💡 You can manually add courses using Prisma Studio at http://localhost:5212');
            }
        } else {
            console.log('✅ Courses already exist in the new schema!');
            console.log('📝 Existing courses:');
            existingCourses.forEach((course: any, i: number) => {
                console.log(`   ${i + 1}. ${course.name}`);
            });
        }

    } catch (error: any) {
        console.error('❌ Error during migration:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
migrateCourseData()
    .then(() => {
        console.log('\n✅ Migration script completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
