import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const playerName = searchParams.get('player') || 'Viet Chu';

        // Find player
        const player = await prisma.player.findFirst({
            where: {
                name: {
                    contains: playerName,
                    mode: 'insensitive'
                }
            }
        });

        if (!player) {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        // Get V2 rounds
        const v2Rounds = await prisma.handicapRound.findMany({
            where: { player_id: player.id },
            orderBy: { date_played: 'desc' },
            take: 10
        });

        // Get V3 rounds
        const v3Rounds = await prisma.roundPlayer.findMany({
            where: { player_id: player.id },
            include: {
                round: true,
                tee_box: true
            },
            orderBy: { round: { date: 'desc' } },
            take: 10
        });

        return NextResponse.json({
            player: {
                name: player.name,
                preferredTee: player.preferred_tee_box
            },
            v2Rounds: v2Rounds.map(r => ({
                date: r.date_played,
                differential: r.score_differential,
                type: 'V2 Historical'
            })),
            v3Rounds: v3Rounds.map(r => ({
                date: r.round.date,
                hasTeeBox: !!r.tee_box,
                teeBoxName: r.tee_box?.name || 'MISSING',
                grossScore: r.gross_score,
                differential: r.score_differential
            }))
        });

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
