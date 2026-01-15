'use server';

import { prisma } from '@/lib/prisma';

/**
 * Diagnostic: Check what tee box data is saved for Viet's recent rounds
 */
export async function checkVietRounds() {
    try {
        // Find Viet
        const viet = await prisma.player.findFirst({
            where: {
                name: {
                    contains: 'Viet',
                    mode: 'insensitive'
                }
            }
        });

        if (!viet) {
            return { success: false, message: 'Viet not found' };
        }

        // Get Viet's recent rounds
        const rounds = await prisma.roundPlayer.findMany({
            where: {
                playerId: viet.id
            },
            include: {
                round: true,
                teeBox: true
            },
            orderBy: {
                round: {
                    date: 'desc'
                }
            },
            take: 10
        });

        const details = rounds.map(r => ({
            date: r.round.date,
            courseName: r.round.courseName,
            gross: r.grossScore,
            // Saved data
            savedName: r.teeBoxName,
            savedPar: r.teeBoxPar,
            savedRating: r.teeBoxRating,
            savedSlope: r.teeBoxSlope,
            // Current tee box
            currentName: r.teeBox?.name,
            currentRating: r.teeBox?.rating,
            currentSlope: r.teeBox?.slope,
            // Indices
            indexBefore: r.indexAtTime,
            indexAfter: r.indexAfter
        }));

        return {
            success: true,
            player: {
                name: viet.name,
                currentIndex: viet.index,
                lowIndex: viet.lowHandicapIndex,
                // preferredTee: viet.preferred_tee_box // Removed
            },
            rounds: details
        };

    } catch (error) {
        console.error('Error checking rounds:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            error: String(error)
        };
    }
}
