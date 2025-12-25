import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: roundPlayerId } = await params;

    if (!roundPlayerId) {
        return NextResponse.json({ error: 'Round Player ID required' }, { status: 400 });
    }

    const scores = await prisma.score.findMany({
        where: { round_player_id: roundPlayerId },
        include: { hole: true },
        orderBy: { hole: { hole_number: 'asc' } }
    });

    return NextResponse.json(scores);
}
