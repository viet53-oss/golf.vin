'use server';

import { prisma } from '@/lib/prisma';
import { calculateHandicap, HandicapInput, calculateScoreDifferential } from '@/lib/handicap';

export interface HandicapHistoryItem {
    id: string;
    date: string;
    type: 'V2' | 'V3';
    teeColor?: string;
    gross?: number;
    adjusted?: number;
    rating?: number;
    slope?: number;
    par?: number;
    differential: number;
    indexBefore: number;
    indexAfter: number;
    used: boolean;
    isLowHi: boolean;
    usedForCurrent?: boolean;
}

export interface HandicapHistoryResponse {
    player: {
        id: string;
        name: string;
        currentIndex: number;
        lowIndex: number | null;
    };
    courseData: {
        par: number;
        tees: {
            name: string;
            rating: number;
            slope: number;
        }[];
    };
    history: HandicapHistoryItem[];
}

// Define the shape of V3 rounds with includes using type inference
type RoundWithDetails = Awaited<ReturnType<typeof prisma.roundPlayer.findMany<{
    include: { round: true; tee_box: true }
}>>>[number];

export async function getHandicapHistory(playerId: string): Promise<HandicapHistoryResponse> {

    // 1. Fetch Player
    const player = await prisma.player.findUnique({
        where: { id: playerId },
    });
    if (!player) throw new Error('Player not found');

    // 2. Fetch Course Data (Main Course: City Park North)
    const course = await prisma.course.findFirst({
        include: { tee_boxes: true, holes: true }
    });

    const coursePar = course?.holes.reduce((sum: number, h: { par: number }) => sum + h.par, 0) || 68;
    const tees = course?.tee_boxes.map((t: { name: string; rating: number; slope: number }) => ({ name: t.name, rating: t.rating, slope: t.slope })) || [];

    // 3. Fetch All Rounds (V2 + V3)
    const v2Rounds = await prisma.handicapRound.findMany({
        where: { player_id: playerId },
    });

    const v3Rounds = await prisma.roundPlayer.findMany({
        where: { player_id: playerId, gross_score: { gte: 1 } },
        include: { round: true, tee_box: true }
    }) as RoundWithDetails[];

    // 4. Normalize & Sort (Ascending for calculation)
    // Find preferred tee box for V2 rounds
    const preferredTeeBox = player.preferred_tee_box && course
        ? course.tee_boxes.find((tb: { name: string }) => tb.name.toLowerCase() === player.preferred_tee_box!.toLowerCase())
        : null;

    let allRounds = [
        ...v2Rounds.map((r: { id: string; date_played: string; score_differential: number; gross_score: number | null }) => ({
            id: r.id,
            date: r.date_played,
            type: 'V2' as const,
            differential: r.score_differential,
            gross: (r as any).gross_score || undefined,
            // Add tee box info for V2 rounds using preferred tee
            teeColor: preferredTeeBox?.name,
            rating: preferredTeeBox?.rating,
            slope: preferredTeeBox?.slope,
            par: coursePar,
        })),
        ...v3Rounds.map((r: RoundWithDetails) => {
            // Use the actual tee box assigned to this round (no override)
            const teeBox = r.tee_box;

            const rating = teeBox?.rating || 72;
            const slope = teeBox?.slope || 113;
            const adjustedScore = r.adjusted_gross_score || r.gross_score!;

            // Calculate differential based on the actual tee box used
            const diff = calculateScoreDifferential(adjustedScore, rating, slope);

            return {
                id: r.id,
                date: r.round.date,
                type: 'V3' as const,
                differential: diff,
                gross: r.gross_score!,
                adjusted: adjustedScore,
                teeColor: teeBox?.name,
                rating,
                slope,
                par: coursePar,
            };
        })
    ];

    // Sort Ascending (Oldest First) to build history
    allRounds.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 5. Calculate Rolling History
    const historyWithIndex: HandicapHistoryItem[] = [];
    const windowRounds: HandicapInput[] = [];

    for (const round of allRounds) {
        // State BEFORE this round (using rounds 0 to n-1)
        const calcBefore = calculateHandicap(windowRounds, player.low_handicap_index);
        const indexBefore = calcBefore.handicapIndex;

        // Add current round to window
        const input: HandicapInput = {
            id: round.id,
            date: round.date,
            differential: round.differential,
        };
        windowRounds.push(input);

        // State AFTER this round (using rounds 0 to n)
        const calcAfter = calculateHandicap(windowRounds, player.low_handicap_index);
        const indexAfter = calcAfter.handicapIndex;

        // Did this specific round count towards the NEW index?
        const used = calcAfter.differentials.some(d => d.id === round.id && d.used);

        // Check Low HI trigger (simplified)
        const isLowHi = player.low_handicap_index === indexAfter;

        historyWithIndex.push({
            ...round,
            indexBefore,
            indexAfter,
            used,
            isLowHi
        });
    }

    // 6. Determine which rounds are used for the CURRENT index
    const finalCalc = calculateHandicap(allRounds, player.low_handicap_index);
    const finalUsedIds = new Set(
        finalCalc.differentials
            .filter(d => d.used)
            .map(d => d.id)
    );

    // 7. Reverse for Display (Newest First) and attach current usage info
    historyWithIndex.reverse();

    // Map usage to the history items
    const finalHistory = historyWithIndex.map(item => ({
        ...item,
        usedForCurrent: finalUsedIds.has(item.id)
    }));

    return {
        player: {
            id: player.id,
            name: player.name,
            currentIndex: player.index,
            lowIndex: player.low_handicap_index
        },
        courseData: {
            par: coursePar,
            tees
        },
        history: finalHistory
    };
}
