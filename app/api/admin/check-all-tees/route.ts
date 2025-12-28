import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Get all players with their rounds
    const players = await prisma.player.findMany({
        include: {
            rounds: {
                include: {
                    round: true,
                    tee_box: true
                },
                orderBy: { round: { date: 'desc' } },
                take: 5 // Last 5 rounds per player
            }
        }
    });

    const report = players.map(player => {
        const teeBoxIssues = player.rounds.filter(r => {
            // Check if tee box doesn't match preferred
            if (!player.preferred_tee_box || !r.tee_box) return false;
            return r.tee_box.name.toLowerCase() !== player.preferred_tee_box.toLowerCase();
        });

        return {
            name: player.name,
            preferredTee: player.preferred_tee_box,
            currentIndex: player.index,
            totalRounds: player.rounds.length,
            teeBoxMismatches: teeBoxIssues.map(r => ({
                date: r.round.date,
                assignedTee: r.tee_box?.name,
                shouldBe: player.preferred_tee_box
            }))
        };
    }).filter(p => p.teeBoxMismatches.length > 0);

    return NextResponse.json({
        totalPlayers: players.length,
        playersWithIssues: report.length,
        issues: report
    });
}
