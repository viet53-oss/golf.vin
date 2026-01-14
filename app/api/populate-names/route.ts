import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        console.log('📝 Populating name fields...\n');

        // 1. Update Holes with names
        console.log('Updating holes...');
        const holes = await prisma.hole.findMany({
            include: { course: true }
        });

        for (const hole of holes) {
            await prisma.hole.update({
                where: { id: hole.id },
                data: {
                    name: `${hole.course.name} - Hole ${hole.holeNumber}`
                }
            });
        }
        console.log(`✅ Updated ${holes.length} holes`);

        // 2. Update RoundPlayers with player names
        console.log('\nUpdating round players...');
        const roundPlayers = await prisma.roundPlayer.findMany({
            include: { player: true }
        });

        for (const rp of roundPlayers) {
            await prisma.roundPlayer.update({
                where: { id: rp.id },
                data: {
                    name: rp.player.name
                }
            });
        }
        console.log(`✅ Updated ${roundPlayers.length} round players`);

        // 3. Update Scores with descriptive names
        console.log('\nUpdating scores...');
        const scores = await prisma.score.findMany({
            include: {
                roundPlayer: { include: { player: true } },
                hole: true
            }
        });

        for (const score of scores) {
            await prisma.score.update({
                where: { id: score.id },
                data: {
                    name: `${score.roundPlayer.player.name} - Hole ${score.hole.holeNumber}`
                }
            });
        }
        console.log(`✅ Updated ${scores.length} scores`);

        return NextResponse.json({
            success: true,
            message: 'Name fields populated successfully!',
            data: {
                holes: holes.length,
                roundPlayers: roundPlayers.length,
                scores: scores.length
            }
        });

    } catch (error: any) {
        console.error('Error populating names:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
