'use server';

import { prisma } from '@/lib/prisma';
import { calculateHandicap, HandicapInput } from '@/lib/handicap';

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
        ? course.tee_boxes.find(tb => tb.name.toLowerCase() === player.preferred_tee_box!.toLowerCase())
        : null;

    let allRounds = [
        ...v2Rounds.map(r => ({
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
        ...v3Rounds.map(r => {
            // Use tee box if available, otherwise find preferred tee box
            let teeBox = r.tee_box;
            if (!teeBox && player.preferred_tee_box && course) {
                teeBox = course.tee_boxes.find(tb =>
                    tb.name.toLowerCase() === player.preferred_tee_box!.toLowerCase()
                ) || null;
            }

            return {
                id: r.id,
                date: r.round.date,
                type: 'V3' as const,
                differential: r.score_differential || 0,
                gross: r.gross_score!,
                adjusted: r.adjusted_gross_score || r.gross_score!,
                teeColor: teeBox?.name,
                rating: teeBox?.rating,
                slope: teeBox?.slope,
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

    // 6. Reverse for Display (Newest First)
    historyWithIndex.reverse();

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
        history: historyWithIndex
    };
}
