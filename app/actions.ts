'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { calculateAdjustedGrossScore } from '@/lib/adjusted-score';
import { calculateScoreDifferential } from '@/lib/handicap';

export async function postScore(formData: FormData) {
    const playerId = formData.get('playerId') as string;
    const courseId = formData.get('courseId') as string;
    const teeBoxId = formData.get('teeBoxId') as string;
    const date = formData.get('date') as string;
    const scoreRaw = formData.get('score');

    if (!playerId || !courseId || !teeBoxId || !date || !scoreRaw) {
        throw new Error('Missing required fields');
    }

    const grossScore = parseInt(scoreRaw as string);
    const points = parseFloat(formData.get('points') as string || '0');
    const payout = parseFloat(formData.get('payout') as string || '0');

    // Fetch tee box for rating/slope
    const teeBox = await prisma.teeBox.findUnique({
        where: { id: teeBoxId }
    });

    if (!teeBox) throw new Error('Tee Box not found');

    // Calculate differential (using Gross as Adjusted Gross since we have no hole scores)
    const differential = calculateScoreDifferential(grossScore, teeBox.rating, teeBox.slope, 0);

    // 1. Find or Create Round
    // We try to find a NON-TOURNAMENT round on this date at this course
    // If one exists, we add the player to it. If not, we create one.
    // This allows "Post Score" to group players together implicitly.
    let round = await prisma.round.findFirst({
        where: {
            date: date,
            course_id: courseId,
            is_tournament: false,
        },
    });

    if (!round) {
        round = await prisma.round.create({
            data: {
                date: date,
                course_id: courseId,
                is_tournament: false,
            },
        });
    }

    // 2. Add the Player's Score
    await prisma.roundPlayer.create({
        data: {
            round_id: round.id,
            player_id: playerId,
            tee_box_id: teeBoxId,
            gross_score: grossScore,
            points: points,
            payout: payout,
            // For now, Adjusted Gross = Gross. 
            // In V4 we can add hole-by-hole logic for true Net Double Bogey.
            adjusted_gross_score: grossScore,
            score_differential: differential,
        },
    });

    revalidatePath('/players');
    revalidatePath('/scores');
    redirect('/players');
}

export async function createRound(date: string, courseId: string, name?: string, isTournament: boolean = false) {
    const round = await prisma.round.create({
        data: {
            date,
            course_id: courseId,
            name,
            is_tournament: isTournament,
        },
    });
    revalidatePath('/scores');
    return round;
}

export async function updateRound(roundId: string, data: { date: string; name?: string; is_tournament: boolean }) {
    await prisma.round.update({
        where: { id: roundId },
        data: {
            date: data.date,
            name: data.name,
            is_tournament: data.is_tournament,
        },
    });
    revalidatePath('/scores');
}

export async function deleteRound(roundId: string) {
    // Cascade delete round players first (although Prisma relation usually handles this if configured, manual is safer without cascade setup)
    await prisma.roundPlayer.deleteMany({
        where: { round_id: roundId },
    });
    await prisma.round.delete({
        where: { id: roundId },
    });
    revalidatePath('/scores');
}

export async function addPlayersToRound(roundId: string, playerIds: string[]) {
    // 1. Get the round to find the course
    const round = await prisma.round.findUnique({
        where: { id: roundId },
        include: { course: { include: { tee_boxes: true } } }
    });

    if (!round) throw new Error("Round not found");

    // 2. Find a default tee box (Preferred: 'White', else first available)
    // We try to match a "Men's Standard" tee usually.
    const defaultTee = round.course.tee_boxes.find(t => t.name === 'White') || round.course.tee_boxes[0];

    // 3. Bulk create entries with default tee box
    await prisma.roundPlayer.createMany({
        data: playerIds.map(pid => ({
            round_id: roundId,
            player_id: pid,
            gross_score: null,
            tee_box_id: defaultTee?.id // May be undefined if no tees exist, but schema usually requires it or allows null. Schema allows null? Let's assume nullable or handled.
        })),
    });
    revalidatePath('/scores');
    // We might need to revalidate the specific edit page, but typically server actions revalidate paths.
}

export async function removePlayerFromRound(roundPlayerId: string) {
    try {
        // Manually cascade delete scores if not handled by DB
        await prisma.score.deleteMany({
            where: { round_player_id: roundPlayerId }
        });

        await prisma.roundPlayer.delete({
            where: { id: roundPlayerId },
        });
        revalidatePath('/scores');
    } catch (error) {
        console.error("Error removing player:", error);
        throw error;
    }
}

export async function createDraftRound() {
    // 1. Get a default course (needed for DB constraint)
    const defaultCourse = await prisma.course.findFirst();
    if (!defaultCourse) {
        throw new Error('No courses found. Please create a course first.');
    }

    // 2. Create the round
    // Default to today (Local Time) with time component
    const now = new Date();
    const localIsoDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const today = localIsoDate + 'T12:00:00';

    const round = await prisma.round.create({
        data: {
            date: today,
            course_id: defaultCourse.id,
            name: "", // Default to blank name
            is_tournament: false,
        },
    });

    return round.id;
}

export async function updatePlayerScore(
    roundPlayerId: string,
    grossScore: number,
    frontNine: number,
    backNine: number,
    points: number = 0,
    payout: number = 0,
    holeScores?: { holeId: string, strokes: number }[]
) {
    // 1. Fetch RoundPlayer to get TeeBox and Hole Pars
    const roundPlayer = await prisma.roundPlayer.findUnique({
        where: { id: roundPlayerId },
        include: {
            tee_box: true,
            round: {
                include: {
                    course: {
                        include: {
                            holes: true
                        }
                    }
                }
            }
        }
    });

    if (!roundPlayer) throw new Error("Round Player not found");

    let adjustedGrossScore = grossScore;
    let scoreDifferential: number | null = roundPlayer.score_differential;

    // 2. Calculate Adjusted Gross Score if hole scores provided
    if (holeScores && holeScores.length > 0) {
        // Map holeScores to include Par
        const holesMap = new Map(roundPlayer.round.course.holes.map(h => [h.id, h]));

        const calcHoles = holeScores.map(hs => {
            const hole = holesMap.get(hs.holeId);
            if (!hole) throw new Error(`Hole ${hs.holeId} not found`);
            return {
                holeNumber: hole.hole_number,
                par: hole.par,
                strokes: hs.strokes
            };
        });

        const result = calculateAdjustedGrossScore(calcHoles);
        adjustedGrossScore = result.adjustedGrossScore;
    }

    // 3. Calculate Differential
    if (roundPlayer.tee_box) {
        const { rating, slope } = roundPlayer.tee_box;
        scoreDifferential = calculateScoreDifferential(adjustedGrossScore, rating, slope, 0);
    }

    await prisma.$transaction(async (tx) => {
        // 1. Update the RoundPlayer summary
        await tx.roundPlayer.update({
            where: { id: roundPlayerId },
            data: {
                gross_score: grossScore,
                adjusted_gross_score: adjustedGrossScore,
                score_differential: scoreDifferential,
                front_nine: frontNine,
                back_nine: backNine,
                points: points,
                payout: payout,
            },
        });

        // 2. If hole-by-hole scores provided, update them
        if (holeScores && holeScores.length > 0) {
            // Delete existing scores for this round player
            await tx.score.deleteMany({
                where: { round_player_id: roundPlayerId }
            });

            // Insert new scores
            await tx.score.createMany({
                data: holeScores.map(hs => ({
                    round_player_id: roundPlayerId,
                    hole_id: hs.holeId,
                    strokes: hs.strokes
                }))
            });
        }
    });

    revalidatePath('/scores');
}

export async function updatePoolParticipants(roundId: string, inPoolPlayerIds: string[]) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Get current players in round to verify valid IDs
            const players = await tx.roundPlayer.findMany({
                where: { round_id: roundId },
                select: { id: true, player_id: true }
            });

            for (const p of players) {
                const isSelected = inPoolPlayerIds.includes(p.player_id);
                // Use explicit boolean for PostgreSQL
                await tx.$executeRawUnsafe(
                    `UPDATE round_players SET in_pool = $1 WHERE id = $2`,
                    isSelected,
                    p.id
                );
            }
        });

        revalidatePath('/pool');
        revalidatePath('/scores');
    } catch (error) {
        console.error('SERVER ACTION ERROR: updatePoolParticipants:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to update pool participants');
    }
}

export async function saveRoundWinnings(roundId: string, payouts: { playerId: string, amount: number }[]) {
    try {
        await prisma.$transaction(async (tx) => {
            for (const p of payouts) {
                await tx.$executeRawUnsafe(
                    `UPDATE round_players SET payout = $1 WHERE round_id = $2 AND player_id = $3`,
                    p.amount,
                    roundId,
                    p.playerId
                );
            }
        });
        revalidatePath('/pool');
        revalidatePath('/scores');
    } catch (error) {
        console.error('SERVER ACTION ERROR: saveRoundWinnings:', error);
        throw new Error('Failed to save winnings');
    }
}
