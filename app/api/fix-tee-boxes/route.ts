import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        console.log('Starting tee box fix...');

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

        console.log(`Found ${roundPlayersWithoutTee.length} round-player records without tee box assignments.`);

        let updated = 0;
        let skipped = 0;
        const results: string[] = [];

        for (const rp of roundPlayersWithoutTee) {
            const preferredTee = rp.player.preferred_tee_box;

            if (!preferredTee) {
                const msg = `⚠️  Player ${rp.player.name} has no preferred tee box. Skipping.`;
                console.log(msg);
                results.push(msg);
                skipped++;
                continue;
            }

            // Find the matching tee box for this course
            const teeBox = rp.round.course.tee_boxes.find(
                (tb: any) => tb.name.toLowerCase() === preferredTee.toLowerCase()
            );

            if (!teeBox) {
                const msg = `⚠️  No ${preferredTee} tee box found for course ${rp.round.course.name}. Skipping.`;
                console.log(msg);
                results.push(msg);
                skipped++;
                continue;
            }

            // Update the RoundPlayer with the correct tee box
            await prisma.roundPlayer.update({
                where: { id: rp.id },
                data: { tee_box_id: teeBox.id }
            });

            const msg = `✅ Updated ${rp.player.name} - Round ${rp.round.date} to use ${teeBox.name} tee (Rating: ${teeBox.rating}, Slope: ${teeBox.slope})`;
            console.log(msg);
            results.push(msg);
            updated++;
        }

        return NextResponse.json({
            success: true,
            updated,
            skipped,
            total: roundPlayersWithoutTee.length,
            results
        });

    } catch (error) {
        console.error('Error fixing tee boxes:', error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
