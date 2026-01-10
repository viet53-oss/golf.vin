'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { calculateAdjustedGrossScore } from '@/lib/adjusted-score';
import { calculateScoreDifferential } from '@/lib/handicap';
import { recalculatePlayerHandicap } from './actions/recalculate-player';

export async function updateRoundPlayerTeeBox(roundPlayerId: string, teeBoxId: string) {
    const teeBox = await prisma.teeBox.findUnique({
        where: { id: teeBoxId }
    });

    if (!teeBox) {
        throw new Error("Tee box not found");
    }

    const roundPlayer = await prisma.roundPlayer.update({
        where: { id: roundPlayerId },
        data: {
            tee_box_id: teeBoxId,
            tee_box_name: teeBox.name,
            tee_box_slope: Math.round(teeBox.slope),
            tee_box_rating: teeBox.rating
        }
    });

    revalidatePath(`/scores/${roundPlayer.round_id}/edit`);
    revalidatePath('/scores');
}

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

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

    // Fetch tee box and course for rating/slope/par
    const teeBox = await prisma.teeBox.findUnique({
        where: { id: teeBoxId },
        include: {
            course: {
                include: {
                    holes: true
                }
            }
        }
    });

    if (!teeBox) throw new Error('Tee Box not found');

    // Calculate course par from holes
    const coursePar = teeBox.course.holes.reduce((sum, hole) => sum + hole.par, 0);

    // Calculate differential (using Gross as Adjusted Gross since we have no hole scores)
    const differential = calculateScoreDifferential(grossScore, teeBox.rating, teeBox.slope, 0);

    // 1. Find or Create Round
    // We try to find a NON-TOURNAMENT, NON-LIVE round on this date at this course
    let round = await prisma.round.findFirst({
        where: {
            date: date,
            course_id: courseId,
            is_tournament: false,
            is_live: false
        },
    });

    if (!round) {
        round = await prisma.round.create({
            data: {
                date: date,
                course_id: courseId,
                is_tournament: false,
                is_live: false,
                completed: true // Posted scores are always complete
            },
        });
    } else {
        // Ensure it is marked completed if it wasn't
        if (!round.completed) {
            await prisma.round.update({
                where: { id: round.id },
                data: { completed: true }
            });
        }
    }

    // 2. Add the Player's Score with tee box data
    await prisma.roundPlayer.create({
        data: {
            round_id: round.id,
            player_id: playerId,
            tee_box_id: teeBoxId,
            tee_box_name: teeBox.name,
            tee_box_par: coursePar,
            tee_box_rating: teeBox.rating,
            tee_box_slope: Math.round(teeBox.slope),
            gross_score: grossScore,
            points: points,
            payout: payout,
            // For now, Adjusted Gross = Gross. 
            // In V4 we can add hole-by-hole logic for true Net Double Bogey.
            adjusted_gross_score: grossScore,
            score_differential: differential,
        },
    });

    // Automatically recalculate handicap for this player
    await recalculatePlayerHandicap(playerId);

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

export async function createLiveRound(data: {
    date: string;
    name: string;
    courseName: string;
    par: number;
    rating: number;
    slope: number;
}) {
    // 1. Create a new Course
    const course = await prisma.course.create({
        data: {
            name: data.courseName,
        }
    });

    // 2. Create 18 holes for this course
    // We'll distribute the total par across 18 holes
    const basePar = Math.floor(data.par / 18);
    const extraPars = data.par % 18;

    for (let i = 1; i <= 18; i++) {
        await prisma.hole.create({
            data: {
                course_id: course.id,
                hole_number: i,
                par: i <= extraPars ? basePar + 1 : basePar,
            }
        });
    }

    // 3. Create a default Tee Box
    await prisma.teeBox.create({
        data: {
            course_id: course.id,
            name: 'Live',
            rating: data.rating,
            slope: data.slope,
        }
    });

    // 4. Create the Round
    const round = await prisma.round.create({
        data: {
            date: data.date.includes('T') ? data.date : `${data.date}T12:00:00`,
            course_id: course.id,
            name: data.name,
            is_tournament: false,
            is_live: true,
        },
    });

    revalidatePath('/live');
    revalidatePath('/scores');
    return round;
}

export async function updateRound(roundId: string, data: { date: string; name?: string; is_tournament: boolean; courseId?: string }) {
    if (data.courseId) {
        // If course is changing, we need to:
        // 1. Update round course_id
        // 2. Clear tee_box_id for all players (since tee boxes belong to old course)
        // 3. Delete all scores (since hole_ids belong to old course)
        await prisma.$transaction([
            prisma.round.update({
                where: { id: roundId },
                data: {
                    date: data.date,
                    name: data.name,
                    is_tournament: data.is_tournament,
                    course_id: data.courseId,
                },
            }),
            // Reset tee boxes for players in this round
            prisma.roundPlayer.updateMany({
                where: { round_id: roundId },
                data: { tee_box_id: null, tee_box_name: null, tee_box_slope: null, tee_box_rating: null }
            }),
            // Delete scores for players in this round (can't do simple deleteMany on scores directly via round relation easily without generic deleteMany with join, 
            // so finding players first or deleteMany on Score where round_player.round_id = roundId if schema supports. 
            // Prisma doesn't support deep nested deleteMany easily. Let's find players first.)
        ]);

        // Delete scores separately or via raw query for efficiency? 
        // Or fetch round players and delete their scores.
        const rps = await prisma.roundPlayer.findMany({ where: { round_id: roundId }, select: { id: true } });
        if (rps.length > 0) {
            await prisma.score.deleteMany({
                where: { round_player_id: { in: rps.map(rp => rp.id) } }
            });
        }

    } else {
        await prisma.round.update({
            where: { id: roundId },
            data: {
                date: data.date,
                name: data.name,
                is_tournament: data.is_tournament,
            },
        });
    }
    revalidatePath(`/scores/${roundId}/edit`);
    revalidatePath('/scores');
}

export async function deleteRound(roundId: string) {
    try {
        // 1. Delete associated MoneyEvents
        await prisma.moneyEvent.deleteMany({
            where: { round_id: roundId }
        });

        // 2. Find all round players to delete their scores
        const roundPlayers = await prisma.roundPlayer.findMany({
            where: { round_id: roundId },
            select: { id: true }
        });

        // 3. Delete all scores for these players
        if (roundPlayers.length > 0) {
            // Delete scores first
            await prisma.score.deleteMany({
                where: {
                    round_player_id: {
                        in: roundPlayers.map(rp => rp.id)
                    }
                }
            });
        }

        // 4. Delete round players
        await prisma.roundPlayer.deleteMany({
            where: { round_id: roundId },
        });

        // 5. Delete the round itself
        await prisma.round.delete({
            where: { id: roundId },
        });

        revalidatePath('/scores');
        revalidatePath('/live');
    } catch (error) {
        console.error("Error deleting round:", error);
        throw error;
    }
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
    const defaultTee = round.course.tee_boxes.find((t: { name: string }) => t.name === 'White') || round.course.tee_boxes[0];

    // 3. Bulk create entries with default tee box
    await prisma.roundPlayer.createMany({
        data: playerIds.map(pid => ({
            round_id: roundId,
            player_id: pid,
            gross_score: null,
            tee_box_id: defaultTee?.id // May be undefined if no tees exist, but schema usually requires it or allows null. Schema allows null? Let's assume nullable or handled.
        })),
    });
    revalidatePath(`/scores/${roundId}/edit`);
    revalidatePath('/scores');
}

export async function removePlayerFromRound(roundPlayerId: string) {
    try {
        // Manually cascade delete scores if not handled by DB
        await prisma.score.deleteMany({
            where: { round_player_id: roundPlayerId }
        });

        const deleted = await prisma.roundPlayer.delete({
            where: { id: roundPlayerId },
        });
        revalidatePath(`/scores/${deleted.round_id}/edit`);
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

export async function createTournamentRound(name: string, date: string) {
    // 1. Get a default course (needed for DB constraint)
    const defaultCourse = await prisma.course.findFirst();
    if (!defaultCourse) {
        throw new Error('No courses found. Please create a course first.');
    }

    // 2. Create the round with provided details
    // Ensure date has time component for proper sorting if needed, or just ISO string from input
    // Input date usually YYYY-MM-DD. We append T12:00:00 to valid ISO timestamp if needed.
    const isoDate = date.includes('T') ? date : `${date}T12:00:00`;

    const round = await prisma.round.create({
        data: {
            date: isoDate,
            course_id: defaultCourse.id,
            name: name,
            is_tournament: true,
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
        const holesMap = new Map<string, { id: string; hole_number: number; par: number }>(
            roundPlayer.round.course.holes.map((h: { id: string; hole_number: number; par: number }) => [h.id, h])
        );

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

    await prisma.$transaction(async (tx: TransactionClient) => {
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

        // 2. Ensure round is marked completed if not live (fixes "stuck" rounds)
        if (!roundPlayer.round.is_live) {
            await tx.round.update({
                where: { id: roundPlayer.round.id },
                data: { completed: true }
            });
        }

        // 3. If hole-by-hole scores provided, update them
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

    // Automatically recalculate handicap for this player
    const playerInfo = await prisma.roundPlayer.findUnique({
        where: { id: roundPlayerId },
        select: { player_id: true }
    });
    if (playerInfo) {
        await recalculatePlayerHandicap(playerInfo.player_id);
    }

    revalidatePath(`/scores/${roundPlayer.round.id}/edit`);
    revalidatePath('/scores');
}

export async function updatePoolParticipants(roundId: string, inPoolPlayerIds: string[]) {
    try {
        await prisma.$transaction(async (tx: TransactionClient) => {
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
        await prisma.$transaction(async (tx: TransactionClient) => {
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

export async function createEvent(name: string, date: string) {
    const event = await prisma.event.create({
        data: {
            name,
            date,
        },
    });
    revalidatePath('/schedule');
    return event;
}

export async function deleteEvent(id: string) {
    await prisma.event.delete({
        where: { id },
    });
    revalidatePath('/schedule');
}

export async function createRoundWithPlayers(
    data: { date: string; name: string; is_tournament: boolean; courseId?: string },
    players: {
        playerId: string;
        teeBoxId?: string;
        gross?: number | null;
        points?: number;
        payout?: number;
        scores?: { holeId: string; strokes: number }[];
    }[]
) {
    // 1. Get the course WITH holes
    let course;
    const include = { tee_boxes: true, holes: true };

    if (data.courseId) {
        course = await prisma.course.findUnique({
            where: { id: data.courseId },
            include
        });
        if (!course) throw new Error('Course not found.');
    } else {
        course = await prisma.course.findFirst({
            include
        });
        if (!course) throw new Error('No courses found.');
    }

    // 2. Fetch Player Indices for Snapshot
    const playerIds = players.map(p => p.playerId);
    const dbPlayers = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, index: true }
    });
    const playerMap = new Map(dbPlayers.map(p => [p.id, p]));

    // 3. Create the round
    const round = await prisma.round.create({
        data: {
            date: data.date,
            course_id: course.id,
            name: data.name,
            is_tournament: data.is_tournament,
            completed: true,
        },
    });

    // 4. Add players and calculate stats
    if (players.length > 0) {
        const defaultTee = course.tee_boxes.find(t => t.name === 'White') || course.tee_boxes[0];
        const holesMap = new Map<string, { id: string; hole_number: number; par: number }>(
            course.holes.map(h => [h.id, h])
        );
        const coursePar = course.holes.reduce((sum, h) => sum + h.par, 0);

        // Process sequentially
        for (const p of players) {
            const teeBoxId = p.teeBoxId || defaultTee?.id;
            const teeBox = course.tee_boxes.find(t => t.id === teeBoxId);
            const dbPlayer = playerMap.get(p.playerId);

            let front9: number | null = null;
            let back9: number | null = null;
            let adjustedGross = p.gross ?? null;
            let differential: number | null = null;
            let courseHandicap: number | null = null;

            // Calculate Front/Back/Adjusted from hole scores if available
            if (p.scores && p.scores.length > 0) {
                let f9 = 0;
                let b9 = 0;
                const calcHoles: { holeNumber: number; par: number; strokes: number }[] = [];

                for (const s of p.scores) {
                    const hole = holesMap.get(s.holeId);
                    if (hole) {
                        calcHoles.push({ holeNumber: hole.hole_number, par: hole.par, strokes: s.strokes });
                        if (hole.hole_number <= 9) f9 += s.strokes;
                        else b9 += s.strokes;
                    }
                }
                front9 = f9 > 0 ? f9 : null;
                back9 = b9 > 0 ? b9 : null;

                // ESC Calculation
                const result = calculateAdjustedGrossScore(calcHoles);
                // Only use calculated adjusted gross if we have scores, otherwise trust p.gross (or keep logic consistent)
                if (calcHoles.length > 0) {
                    adjustedGross = result.adjustedGrossScore;
                }
            }

            // Calculate Course Handicap
            // Formula: Index * (Slope / 113) + (Rating - Par)
            if (dbPlayer && teeBox) {
                // Determine par for this tee box (approximate with course par if tee box par not stored)
                // Assuming defaults. Ideally TeeBox model would have Par.
                courseHandicap = Math.round(dbPlayer.index * (teeBox.slope / 113) + (teeBox.rating - coursePar));
            }

            // Calculate Score Differential
            if (adjustedGross && teeBox) {
                differential = calculateScoreDifferential(adjustedGross, teeBox.rating, teeBox.slope, 0);
            }

            const rp = await prisma.roundPlayer.create({
                data: {
                    round_id: round.id,
                    player_id: p.playerId,
                    gross_score: p.gross ?? null,
                    adjusted_gross_score: adjustedGross,
                    score_differential: differential,

                    tee_box_id: teeBox?.id,
                    tee_box_name: teeBox?.name,
                    tee_box_rating: teeBox?.rating,
                    tee_box_slope: teeBox?.slope ? Math.round(teeBox.slope) : null,
                    tee_box_par: coursePar,

                    course_handicap: courseHandicap,
                    index_at_time: dbPlayer?.index,

                    front_nine: front9,
                    back_nine: back9,

                    points: p.points || 0,
                    payout: p.payout || 0
                }
            });

            // Insert scores if present
            if (p.scores && p.scores.length > 0) {
                await prisma.score.createMany({
                    data: p.scores.map(s => ({
                        round_player_id: rp.id,
                        hole_id: s.holeId,
                        strokes: s.strokes
                    }))
                });
            }
        }
    }

    // 5. Recalculate Handicap for all involved players
    // Using Promise.allSettled to avoid failing the request if one calculation fails
    await Promise.allSettled(players.map(p => recalculatePlayerHandicap(p.playerId)));

    revalidatePath('/scores');
    return round.id;
}




