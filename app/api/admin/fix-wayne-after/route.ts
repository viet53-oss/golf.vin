
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('Starting Fix for Wayne Index After...');

    // Target: Wayne Huth, 12/13
    // Desired Index After: 22.9

    const round = await prisma.round.findFirst({
        where: { date: { contains: '2025-12-13' } }
    });

    if (!round) return NextResponse.json({ error: 'Round not found' });

    const player = await prisma.player.findFirst({
        where: { name: 'Wayne Huth' }
    });

    if (!player) return NextResponse.json({ error: 'Player not found' });

    const rp = await prisma.roundPlayer.findFirst({
        where: {
            round_id: round.id,
            player_id: player.id
        }
    });

    if (rp) {
        await prisma.roundPlayer.update({
            where: { id: rp.id },
            data: { index_after: 22.9 }
        });
        return NextResponse.json({
            success: true,
            message: 'Updated Wayne Huth index_after to 22.9 for 12/13 round',
            old: rp.index_after,
            new: 22.9
        });
    }

    return NextResponse.json({ error: 'RoundPlayer record not found' });
}
