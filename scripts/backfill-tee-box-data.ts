import { prisma } from '../lib/prisma';

/**
 * Backfills tee box data (par, rating, slope, name) for all existing round players
 * that are missing this information.
 */
async function backfillTeeBoxData() {
    console.log('🔄 Starting tee box data backfill...\n');

    try {
        // Get all round players that are missing tee box data
        const roundPlayers = await prisma.roundPlayer.findMany({
            where: {
                OR: [
                    { tee_box_par: null },
                    { tee_box_rating: null },
                    { tee_box_slope: null },
                    { tee_box_name: null }
                ]
            },
            include: {
                tee_box: {
                    include: {
                        course: {
                            include: {
                                holes: true
                            }
                        }
                    }
                },
                round: {
                    include: {
                        course: {
                            include: {
                                holes: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`Found ${roundPlayers.length} round players missing tee box data\n`);

        let updated = 0;
        let skipped = 0;

        for (const rp of roundPlayers) {
            // Try to get tee box data
            const teeBox = rp.tee_box;

            if (!teeBox) {
                console.log(`⚠️  Skipping round player ${rp.id} - no tee box assigned`);
                skipped++;
                continue;
            }

            // Calculate par from the course holes
            const course = teeBox.course || rp.round.course;
            const coursePar = course.holes.reduce((sum, hole) => sum + hole.par, 0);

            // Update the round player with tee box data
            await prisma.roundPlayer.update({
                where: { id: rp.id },
                data: {
                    tee_box_name: rp.tee_box_name || teeBox.name,
                    tee_box_par: rp.tee_box_par || coursePar,
                    tee_box_rating: rp.tee_box_rating || teeBox.rating,
                    tee_box_slope: rp.tee_box_slope || Math.round(teeBox.slope)
                }
            });

            updated++;

            if (updated % 10 === 0) {
                console.log(`✅ Updated ${updated} round players...`);
            }
        }

        console.log(`\n✅ Backfill complete!`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Total: ${roundPlayers.length}`);

    } catch (error) {
        console.error('❌ Error during backfill:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

backfillTeeBoxData();
