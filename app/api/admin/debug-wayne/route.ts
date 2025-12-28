import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateHandicap, HandicapInput } from '@/lib/handicap';

export const dynamic = 'force-dynamic';

export async function GET() {
    const player = await prisma.player.findFirst({
        where: { name: 'Wayne Huth' },
        include: {
            rounds: {
                include: { round: true, tee_box: true },
                orderBy: { round: { date: 'desc' } }
            },
            manual_rounds: {
                orderBy: { date_played: 'desc' }
            }
        }
    });

    if (!player) {
        return NextResponse.json({ error: 'Player not found' });
    }

    // Build handicap inputs
    const tournamentRounds: HandicapInput[] = player.rounds
        .filter((r: any) => r.tee_box && r.gross_score !== null)
        .map((r: any) => ({
            id: r.id,
            date: r.round.date,
            score: (r.adjusted_gross_score || r.gross_score) ?? 0,
            rating: r.tee_box!.rating,
            slope: r.tee_box!.slope,
        }));

    const manualRounds: HandicapInput[] = player.manual_rounds.map((m: any) => ({
        id: m.id,
        date: m.date_played,
        differential: m.score_differential
    }));

    const allRounds = [...tournamentRounds, ...manualRounds];

    // Calculate handicap
    const result = calculateHandicap(allRounds, player.low_handicap_index);

    // Get details of the calculation
    const recent20 = result.differentials.slice(0, 20);
    const used = recent20.filter(d => d.used);

    return NextResponse.json({
        playerName: player.name,
        currentStoredIndex: player.index,
        calculatedIndex: result.handicapIndex,
        lowHandicapIndex: player.low_handicap_index,
        isSoftCapped: result.isSoftCapped,
        isHardCapped: result.isHardCapped,
        totalRounds: allRounds.length,
        recent20Differentials: recent20.map(d => ({
            date: d.date,
            differential: d.value,
            used: d.used
        })),
        usedDifferentials: used.map(d => d.value),
        averageOfUsed: used.reduce((sum, d) => sum + d.value, 0) / used.length,
        afterMultiplier: (used.reduce((sum, d) => sum + d.value, 0) / used.length) * 0.96
    });
}
