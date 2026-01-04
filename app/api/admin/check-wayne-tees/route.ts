import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const wayne = await prisma.player.findFirst({
            where: { name: 'Wayne Huth' },
            include: {
                rounds: {
                    include: {
                        round: {
                            select: {
                                date: true,
                                name: true,
                            }
                        },
                        tee_box: true
                    },
                    orderBy: {
                        round: {
                            date: 'desc'
                        }
                    }
                },
                manual_rounds: {
                    orderBy: {
                        date_played: 'desc'
                    }
                }
            }
        });

        if (!wayne) {
            return NextResponse.json({ error: 'Wayne not found' });
        }

        const roundsInfo = wayne.rounds.map(r => ({
            type: 'tournament',
            date: r.round.date,
            roundName: r.round.name,
            teeBox: r.tee_box ? {
                name: r.tee_box.name,
                rating: r.tee_box.rating,
                slope: r.tee_box.slope
            } : null,
            grossScore: r.gross_score,
            adjustedScore: r.adjusted_gross_score,
            scoreDifferential: r.score_differential,
            indexAfter: r.index_after
        }));

        const manualRoundsInfo = wayne.manual_rounds.map(r => ({
            type: 'manual',
            date: r.date_played,
            grossScore: r.gross_score,
            scoreDifferential: r.score_differential
        }));

        // Combine and sort all rounds by date
        const allRounds = [...roundsInfo, ...manualRoundsInfo].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return NextResponse.json({
            playerName: wayne.name,
            preferredTee: wayne.preferred_tee_box,
            currentIndex: wayne.index,
            totalTournamentRounds: roundsInfo.length,
            totalManualRounds: manualRoundsInfo.length,
            allRounds: allRounds,
            tournamentRounds: roundsInfo,
            manualRounds: manualRoundsInfo
        });
    } catch (error) {
        console.error('Error checking Wayne tees:', error);
        return NextResponse.json({ error: 'Failed to check Wayne tees' }, { status: 500 });
    }
}
