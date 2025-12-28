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

    // Find Wayne's November rounds
    const wayne = await prisma.player.findFirst({
        where: { name: 'Wayne Huth' }
    });

    if (!wayne) {
        return NextResponse.json({ error: 'Wayne not found' });
    }

    const novemberRounds = await prisma.roundPlayer.findMany({
        where: {
            player_id: wayne.id,
            round: {
                date: {
                    gte: '2025-11-01',
                    lt: '2025-12-01'
                }
            }
        },
        include: { round: true, tee_box: true }
    });

    // Update each round to use Gold tee box
    for (const rp of novemberRounds) {
        await prisma.roundPlayer.update({
            where: { id: rp.id },
            data: { tee_box_id: goldTee.id }
        });
    }

    return NextResponse.json({
        success: true,
        message: `Updated ${novemberRounds.length} November rounds to Gold tee box`,
        rounds: novemberRounds.map(r => ({
            date: r.round.date,
            oldTee: r.tee_box?.name,
            newTee: 'Gold'
        }))
    });
}
