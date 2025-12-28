import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const wayne = await prisma.player.findFirst({
        where: { name: 'Wayne Huth' },
        include: {
            rounds: {
                include: { round: true, tee_box: true },
                orderBy: { round: { date: 'asc' } }
            },
            manual_rounds: {
                orderBy: { date_played: 'asc' }
            }
        }
    });

    if (!wayne) {
        return NextResponse.json({ error: 'Wayne not found' });
    }

    const allRounds = [
        ...wayne.rounds.map((r: any) => ({
            type: 'v3',
            date: r.round.date,
            gross: r.gross_score,
            adjusted: r.adjusted_gross_score,
            rating: r.tee_box?.rating,
            slope: r.tee_box?.slope,
            differential: r.score_differential
        })),
        ...wayne.manual_rounds.map((r: any) => ({
            type: 'v2',
            date: r.date_played,
            differential: r.score_differential
        }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
        playerName: wayne.name,
        totalRounds: allRounds.length,
        allRounds
    });
}
