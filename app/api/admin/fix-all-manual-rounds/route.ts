import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
    try {
        // Get all players with their manual rounds and preferred tee
        const players = await prisma.player.findMany({
            include: {
                manual_rounds: true
            }
        });

        // Get course data for tee box info
        const course = await prisma.course.findFirst({
            include: {
                tee_boxes: true,
                holes: true
            }
        });

        if (!course) {
            return NextResponse.json({ error: 'Course not found' });
        }

        const updates = [];
        let totalUpdated = 0;

        for (const player of players) {
            if (player.manual_rounds.length === 0) continue;

            // Get player's preferred tee box (default to White if not set)
            const preferredTeeName = player.preferred_tee_box || 'White';
            const teeBox = course.tee_boxes.find(t => t.name === preferredTeeName);

            if (!teeBox) {
                console.error(`Tee box ${preferredTeeName} not found for player ${player.name}`);
                continue;
            }

            const { rating, slope } = teeBox;

            // Update each manual round with correct differential
            for (const round of player.manual_rounds) {
                if (round.gross_score === null) continue;

                // Calculate correct differential using player's preferred tee
                // Formula: (Gross Score - Rating) × (113 / Slope)
                const correctDifferential = parseFloat(
                    ((round.gross_score - rating) * (113 / slope)).toFixed(1)
                );

                // Only update if different
                if (Math.abs(correctDifferential - round.score_differential) > 0.05) {
                    await prisma.handicapRound.update({
                        where: { id: round.id },
                        data: { score_differential: correctDifferential }
                    });

                    updates.push({
                        player: player.name,
                        date: round.date_played,
                        teeBox: preferredTeeName,
                        rating,
                        slope,
                        grossScore: round.gross_score,
                        oldDifferential: round.score_differential,
                        newDifferential: correctDifferential
                    });

                    totalUpdated++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${totalUpdated} manual rounds across ${players.length} players`,
            totalUpdated,
            updates
        });
    } catch (error) {
        console.error('Error fixing manual rounds:', error);
        return NextResponse.json({ error: 'Failed to fix manual rounds' }, { status: 500 });
    }
}
