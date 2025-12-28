
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const RESTORE_DATA = [
    { "player": "John Rhoton", "date": "2025-11-22T12:00:00", "old": 23.1 },
    { "player": "Wayne Huth", "date": "2025-11-22T12:00:00", "old": 23.4 },
    { "player": "Ray LoCicero", "date": "2025-11-22T12:00:00", "old": 9.5 },
    { "player": "Eric Yancovich", "date": "2025-11-22T12:00:00", "old": 17.4 },
    { "player": "Durel Legendre Jr.", "date": "2025-11-22T12:00:00", "old": 14.2 },
    { "player": "Blake LoCicero", "date": "2025-11-22T12:00:00", "old": 11.6 },
    { "player": "Steve Lovecchio", "date": "2025-11-22T12:00:00", "old": 14.3 },
    { "player": "Michael Morris", "date": "2025-11-22T12:00:00", "old": 19.3 },
    { "player": "Kevin Thompson", "date": "2025-11-22T12:00:00", "old": 17.8 },
    { "player": "Michael Gupton", "date": "2025-11-22T12:00:00", "old": 15.5 },
    { "player": "Barry Burns", "date": "2025-11-22T12:00:00", "old": 5.2 },
    { "player": "Bradley Lips", "date": "2025-11-22T12:00:00", "old": 29.9 },
    { "player": "Jason Bailey", "date": "2025-11-22T12:00:00", "old": 24 },
    { "player": "Van Meador", "date": "2025-11-22T12:00:00", "old": 12.7 },
    { "player": "Kevin Morris", "date": "2025-11-22T12:00:00", "old": 15.7 },
    { "player": "Henry Peeler", "date": "2025-11-22T12:00:00", "old": 25.7 },
    { "player": "Salvadore Genovese", "date": "2025-11-22T12:00:00", "old": 31.6 },
    { "player": "Viet Chu", "date": "2025-11-22T12:00:00", "old": 18.1 },
    { "player": "Charlie  Albright", "date": "2025-11-22T12:00:00", "old": 17.7 },
    { "player": "Will Just", "date": "2025-11-22T12:00:00", "old": 7.4 },
    { "player": "Marion Gilford", "date": "2025-11-22T12:00:00", "old": 31.3 },
    { "player": "Lynn Comeaux", "date": "2025-11-22T12:00:00", "old": 18.2 },
    { "player": "Dave Wood", "date": "2025-11-22T12:00:00", "old": 17.8 },
    { "player": "Glenn Marino", "date": "2025-11-22T12:00:00", "old": 26.5 },
    { "player": "Victor Bonifatti", "date": "2025-11-22T12:00:00", "old": 15.5 },
    { "player": "Kenny Chevis", "date": "2025-11-22T12:00:00", "old": 14.3 },
    { "player": "Wayne Huth", "date": "2025-12-13T12:00:00", "old": 22.3 },
    { "player": "Barry Burns", "date": "2025-12-13T12:00:00", "old": 6.3 },
    { "player": "Victor Bonifatti", "date": "2025-12-13T12:00:00", "old": 13.5 },
    { "player": "Salvadore Genovese", "date": "2025-12-13T12:00:00", "old": 31.2 },
    { "player": "Dave Wood", "date": "2025-12-13T12:00:00", "old": 18.4 },
    { "player": "Ray LoCicero", "date": "2025-12-13T12:00:00", "old": 9.2 },
    { "player": "Steve Lovecchio", "date": "2025-12-13T12:00:00", "old": 13.2 },
    { "player": "Lynn Comeaux", "date": "2025-12-13T12:00:00", "old": 18.5 },
    { "player": "Blake LoCicero", "date": "2025-12-13T12:00:00", "old": 11.6 },
    { "player": "Tom McDonnell", "date": "2025-12-13T12:00:00", "old": 20.7 },
    { "player": "Mark Froom", "date": "2025-12-13T12:00:00", "old": 7.3 },
    { "player": "Charlie  Albright", "date": "2025-12-13T12:00:00", "old": 16.5 },
    { "player": "Jason Bailey", "date": "2025-12-13T12:00:00", "old": 22 }
];

export async function GET() {
    console.log('Starting RESTORE...');
    const results = [];

    for (const item of RESTORE_DATA) {
        // Find the round player
        // Note: We need to find the round first by date? Or search roundPlayer by player name + round date?
        // Using `findFirst` with composite search.

        let targetIndex = item.old;

        // SPECIAL FIX FOR WAYNE ON DEC 13
        if (item.player === 'Wayne Huth' && item.date.includes('2025-12-13')) {
            targetIndex = 22.9; // CORRECT VALUE requested by user
        }

        // Find round by date
        const round = await prisma.round.findFirst({
            where: {
                date: {
                    equals: item.date
                }
            }
        });

        if (round) {
            // Find player
            const players = await prisma.player.findMany({
                where: { name: item.player }
            });

            for (const p of players) {
                const rp = await prisma.roundPlayer.findFirst({
                    where: {
                        round_id: round.id,
                        player_id: p.id
                    }
                });

                if (rp) {
                    await prisma.roundPlayer.update({
                        where: { id: rp.id },
                        data: { index_at_time: targetIndex }
                    });
                    results.push(`Restored ${item.player} to ${targetIndex}`);
                }
            }
        }
    }

    return NextResponse.json({ restored: results });
}
