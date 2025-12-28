import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Find the Gold tee box
    const goldTee = await prisma.teeBox.findFirst({
        where: {
            name: 'Gold',
            course: { name: 'City Park North' }
        }
    });

    if (!goldTee) {
        return NextResponse.json({ error: 'Gold tee box not found' });
    }

    // Get all players who prefer Gold tees
    const goldPlayers = await prisma.player.findMany({
        where: {
            preferred_tee_box: {
                equals: 'Gold',
                mode: 'insensitive'
            }
        }
    });

    const playerIds = goldPlayers.map(p => p.id);

    // Find all their rounds that are assigned to White tees
    const whiteTeeBox = await prisma.teeBox.findFirst({
        where: {
            name: 'White',
            course: { name: 'City Park North' }
        }
    });

    if (!whiteTeeBox) {
        return NextResponse.json({ error: 'White tee box not found' });
    }

    const incorrectRounds = await prisma.roundPlayer.findMany({
        where: {
            player_id: { in: playerIds },
            tee_box_id: whiteTeeBox.id
        },
        include: { round: true, player: true }
    });

    // Update all incorrect rounds to Gold
    const updates = [];
    for (const rp of incorrectRounds) {
        await prisma.roundPlayer.update({
            where: { id: rp.id },
            data: { tee_box_id: goldTee.id }
        });
        updates.push({
            player: rp.player.name,
            date: rp.round.date
        });
    }

    return NextResponse.json({
        success: true,
        message: `Fixed ${updates.length} rounds for ${new Set(updates.map(u => u.player)).size} players`,
        updates
    });
}
