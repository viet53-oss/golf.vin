// Run this with: npx tsx scripts/add-city-park.ts

import { prisma } from '../lib/prisma';

async function main() {
    console.log('🏌️ Adding City Park North - New Orleans...\n');

    try {
        // Create City Park North course
        const course = await prisma.course.create({
            data: {
                name: "City Park North",
            }
        });
        console.log(`✅ Course created: ${course.name}`);

        // Create tee boxes
        const teeBoxes = [
            { name: "White", rating: 63.8, slope: 100, par: 68 },
            { name: "Gold", rating: 61.3, slope: 92, par: 68 },
            { name: "Blue", rating: 65.9, slope: 109, par: 68 },
            { name: "Black", rating: 67.1, slope: 111, par: 68 },
        ];

        console.log('\n📦 Creating tee boxes...');
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
            console.log(`   ✅ ${teeBox.name} Tees - Rating: ${teeBox.rating}, Slope: ${teeBox.slope}, Par: ${teeBox.par}`);
        }

        // Create holes with par values from the screenshot
        const holes = [
            // Front 9
            { number: 1, par: 4 },
            { number: 2, par: 3 },
            { number: 3, par: 5 },
            { number: 4, par: 4 },
            { number: 5, par: 4 },
            { number: 6, par: 4 },
            { number: 7, par: 4 },
            { number: 8, par: 4 },
            { number: 9, par: 4 },
            // Back 9
            { number: 10, par: 4 },
            { number: 11, par: 3 },
            { number: 12, par: 3 },
            { number: 13, par: 4 },
            { number: 14, par: 4 },
            { number: 15, par: 3 },
            { number: 16, par: 3 },
            { number: 17, par: 4 },
            { number: 18, par: 4 },
        ];

        console.log('\n⛳ Creating holes...');
        for (const hole of holes) {
            await prisma.hole.create({
                data: {
                    courseId: course.id,
                    holeNumber: hole.number,
                    par: hole.par,
                }
            });
        }

        const frontNinePar = holes.slice(0, 9).reduce((sum, h) => sum + h.par, 0);
        const backNinePar = holes.slice(9).reduce((sum, h) => sum + h.par, 0);
        const totalPar = frontNinePar + backNinePar;

        console.log(`   ✅ Front 9: Par ${frontNinePar}`);
        console.log(`   ✅ Back 9: Par ${backNinePar}`);
        console.log(`   ✅ Total: Par ${totalPar}`);

        console.log('\n✨ City Park North added successfully!');
        console.log('\n📊 Summary:');
        console.log(`   Course: ${course.name}`);
        console.log(`   Tee Boxes: 4 (White, Gold, Blue, Black)`);
        console.log(`   Holes: 18`);
        console.log(`   Total Par: ${totalPar}`);
        console.log('\n🌐 View in Prisma Studio: http://localhost:5212');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

main()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed:', error);
        process.exit(1);
    });
