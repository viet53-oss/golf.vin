import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Find Wayne Huth
    const wayne = await prisma.player.findFirst({
        where: { name: 'Wayne Huth' }
    });

    if (!wayne) {
        return NextResponse.json({ error: 'Wayne not found' });
    }

    // Get his most recent round to see what his index_after should be
    const latestRound = await prisma.roundPlayer.findFirst({
        where: { player_id: wayne.id },
        orderBy: { round: { date: 'desc' } },
        include: { round: true }
    });

    if (!latestRound) {
        return NextResponse.json({ error: 'No rounds found' });
    }

    const currentIndexInDB = wayne.index;
    const indexAfterLatestRound = latestRound.index_after;

    if (!indexAfterLatestRound) {
        return NextResponse.json({ error: 'Latest round has no index_after value' });
    }

    // Update player's current index to match the index_after from latest round
    if (currentIndexInDB !== indexAfterLatestRound) {
        await prisma.player.update({
            where: { id: wayne.id },
            data: { index: indexAfterLatestRound }
        });

        return NextResponse.json({
            success: true,
            message: 'Updated Wayne\'s current index',
            old: currentIndexInDB,
            new: indexAfterLatestRound,
            latestRoundDate: latestRound.round.date
        });
    }

    return NextResponse.json({
        success: true,
        message: 'Index already correct',
        currentIndex: currentIndexInDB,
        latestRoundDate: latestRound.round.date
    });
}
