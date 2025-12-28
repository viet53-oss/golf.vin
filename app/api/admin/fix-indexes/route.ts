
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateHandicap } from '@/lib/handicap';

// Force dynamic to ensure it runs
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Starting historical index fix via API...');

        // 1. Fetch relevant rounds (Nov 22 and Dec 13)
        const allRounds = await prisma.round.findMany({
            where: {
                OR: [
                    { date: { contains: '2025-12-13' } },
                    { date: { contains: '2025-11-22' } }
                ]
            },
            orderBy: { date: 'asc' },
            include: {
                players: {
                    include: {
                        player: {
                            select: { id: true, name: true, preferred_tee_box: true }
                        },
                        tee_box: true,
                        scores: {
                            include: { hole: true }
                        }
                    }
                },
                course: {
                    include: {
                        tee_boxes: true
                    }
                }
            }
        });

        const updates = [];

        for (const round of allRounds) {
            for (const rp of round.players) {
                // Fetch history for this player prior to round
                const playerHistory = await prisma.roundPlayer.findMany({
                    where: {
                        player_id: rp.player_id,
                        round: {
                            date: {
                                lt: round.date
                            }
                        }
                    },
                    include: {
                        round: true,
                        tee_box: true
                    },
                    orderBy: {
                        round: { date: 'desc' }
                    }
                });

                const historyInput = playerHistory.map(h => {
                    let slope = h.tee_box?.slope || 113;
                    let rating = h.tee_box?.rating || 72;
                    return {
                        id: h.id,
                        date: new Date(h.round.date).toISOString().split('T')[0],
                        score: h.adjusted_gross_score || h.gross_score || 0,
                        rating: rating,
                        slope: slope
                    };
                }).filter(h => h.score > 0);

                const calcResult = calculateHandicap(historyInput);
                const newIndex = calcResult.handicapIndex;
                const oldIndex = rp.index_at_time;

                if (oldIndex !== newIndex && Math.abs((oldIndex ?? -99) - newIndex) > 0.05) {
                    // Update!
                    console.log(`Updating ${rp.player.name} on ${round.date}: ${oldIndex} -> ${newIndex}`);
                    await prisma.roundPlayer.update({
                        where: { id: rp.id },
                        data: { index_at_time: newIndex }
                    });
                    updates.push({
                        player: rp.player.name,
                        date: round.date,
                        old: oldIndex,
                        new: newIndex
                    });
                }
            }
        }

        return NextResponse.json({ success: true, updates });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
