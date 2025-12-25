import 'dotenv/config';
import { prisma } from '../lib/prisma';

/**
 * This script updates all RoundPlayer records that are missing tee_box_id
 * to use the player's preferred_tee_box from their profile.
 */

async function fixMissingTeeBoxes() {
    console.log('Starting tee box fix...\n');

    // 1. Get all RoundPlayer records without a tee_box_id
    const roundPlayersWithoutTee = await prisma.roundPlayer.findMany({
        where: {
            tee_box_id: null
        },
        include: {
            player: true,
            round: {
                include: {
                    course: {
                        include: {
                            tee_boxes: true
                        }
                    }
                }
            }
        }
    });

    console.log(`Found ${roundPlayersWithoutTee.length} round-player records without tee box assignments.\n`);

    let updated = 0;
    let skipped = 0;

    for (const rp of roundPlayersWithoutTee) {
        const preferredTee = rp.player.preferred_tee_box;

        if (!preferredTee) {
            console.log(`⚠️  Player ${rp.player.name} has no preferred tee box. Skipping.`);
            skipped++;
            continue;
        }

        // Find the matching tee box for this course
        const teeBox = rp.round.course.tee_boxes.find(
            tb => tb.name.toLowerCase() === preferredTee.toLowerCase()
        );

        if (!teeBox) {
            console.log(`⚠️  No ${preferredTee} tee box found for course ${rp.round.course.name}. Skipping.`);
            skipped++;
            continue;
        }

        // Update the RoundPlayer with the correct tee box
        await prisma.roundPlayer.update({
            where: { id: rp.id },
            data: { tee_box_id: teeBox.id }
        });

        console.log(`✅ Updated ${rp.player.name} - Round ${rp.round.date} to use ${teeBox.name} tee (Rating: ${teeBox.rating}, Slope: ${teeBox.slope})`);
        updated++;
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
}

fixMissingTeeBoxes()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
