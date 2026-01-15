'use server';

import { prisma } from '@/lib/prisma';

export async function getPoolResults(roundId: string) {
    try {
        const includeOpts = {
            course: {
                include: { holes: true }
            },
            players: {
                include: {
                    player: true,
                    tee_box: true,
                    scores: {
                        include: { hole: true }
                    }
                }
            }
        };

        const round = await prisma.round.findUnique({
            where: { id: roundId },
            include: includeOpts
        });

        if (!round) {
            return { success: false, error: 'Round not found' };
        }

        // Fetch in_pool status via Raw SQL
        const poolStatusRaw = await prisma.$queryRaw<{ player_id: string, in_pool: boolean }[]>`
            SELECT player_id, in_pool FROM round_players WHERE round_id = ${round.id}
        `;
        const poolStatusMap = new Map(poolStatusRaw.map((p: any) => [p.player_id, Boolean(p.in_pool)]));

        // Fetch all round dates for selector (matching app/pool/page.tsx logic)
        const allRounds = await prisma.round.findMany({
            orderBy: { date: 'desc' },
            select: {
                date: true,
                id: true,
                isTournament: true,
                name: true,
                _count: {
                    select: { players: true }
                }
            }
        });

        const playersRaw = round.players as any[];
        const allPoolParticipants = playersRaw.filter((rp: any) => {
            const rawStatus = poolStatusMap.get(rp.player_id);
            return rawStatus === true;
        });

        const poolActivePlayers = allPoolParticipants.filter((rp: any) => rp.tee_box && rp.gross_score !== null);

        // Determine Flights
        const entryFee = 5.00;
        const totalPot = allPoolParticipants.length * entryFee;

        const flights = [
            { name: "All Players", players: poolActivePlayers, pot: totalPot }
        ];

        const par = round.course?.holes.reduce((sum: number, h: any) => sum + h.par, 0) || 72;

        const calc = (rp: any) => {
            const index = rp.index_at_time ?? rp.player.index;
            const slope = rp.tee_box?.slope || 113;
            const rating = rp.tee_box?.rating || par;

            const courseHcp = Math.round((index * (slope / 113)) + (rating - par));

            let frontGross = rp.front_nine;
            let backGross = rp.back_nine;

            if (!frontGross || !backGross) {
                const scores = rp.scores || [];
                const f = scores
                    .filter((s: any) => s.hole.hole_number <= 9)
                    .reduce((sum: number, s: any) => sum + s.strokes, 0);
                const b = scores
                    .filter((s: any) => s.hole.hole_number > 9)
                    .reduce((sum: number, s: any) => sum + s.strokes, 0);

                if (f > 0) frontGross = f;
                if (b > 0) backGross = b;
            }

            frontGross = frontGross ?? Math.floor((rp.gross_score || 0) / 2);
            backGross = backGross ?? Math.ceil((rp.gross_score || 0) / 2);
            const totalGross = rp.gross_score;

            let frontHcp = 0;
            let backHcp = 0;

            if (round.course?.holes) {
                round.course.holes.forEach((h: any) => {
                    const diff = h.difficulty || 18;
                    const baseStrokes = Math.floor(courseHcp / 18);
                    const remainder = courseHcp % 18;
                    const extraStroke = diff <= remainder ? 1 : 0;
                    const hcpStrokes = baseStrokes + extraStroke;

                    if (h.hole_number <= 9) frontHcp += hcpStrokes;
                    else backHcp += hcpStrokes;
                });
            } else {
                frontHcp = Math.round(courseHcp / 2);
                backHcp = courseHcp - frontHcp;
            }

            const frontNet = frontGross - frontHcp;
            const backNet = backGross - backHcp;
            const totalNet = totalGross - courseHcp;

            const grossHoleScores = rp.scores.map((s: any) => {
                const h = s.hole;
                const diff = h.difficulty || 18;
                return {
                    holeNumber: h.hole_number,
                    difficulty: diff,
                    grossScore: s.strokes
                };
            }).sort((a: any, b: any) => a.difficulty - b.difficulty);

            return {
                id: rp.player.id,
                name: rp.player.name,
                courseHcp,
                frontHcp,
                backHcp,
                frontGross,
                backGross,
                totalGross,
                frontNet,
                backNet,
                totalNet,
                grossHoleScores
            };
        };

        const processedFlights = flights.map((f: any) => {
            const results = f.players.map(calc);
            const potFront = f.pot * 0.40;
            const potBack = f.pot * 0.40;
            const potTotal = f.pot * 0.20;

            const getWinners = (category: 'frontNet' | 'backNet' | 'totalNet', pot: number) => {
                if (results.length === 0 || pot <= 0) return [];

                const sorted = [...results].sort((a: any, b: any) => {
                    if (a[category] !== b[category]) return a[category] - b[category];
                    const filter = (h: any) => {
                        if (category === 'frontNet') return h.holeNumber <= 9;
                        if (category === 'backNet') return h.holeNumber > 9;
                        return true;
                    };
                    const aHoles = a.grossHoleScores.filter(filter);
                    const bHoles = b.grossHoleScores.filter(filter);
                    for (let i = 0; i < aHoles.length; i++) {
                        if (aHoles[i].grossScore !== bHoles[i].grossScore) {
                            return aHoles[i].grossScore - bHoles[i].grossScore;
                        }
                    }
                    return 0;
                });

                const percentages = [0.5, 0.3, 0.2];
                const finalWinners: any[] = [];
                let prizeIndex = 0;
                let i = 0;
                while (prizeIndex < percentages.length && i < sorted.length) {
                    const currentScore = sorted[i][category];
                    const currentGrossHoles = sorted[i].grossHoleScores;
                    const absoluteTies = sorted.slice(i).filter((r: any) =>
                        r[category] === currentScore &&
                        JSON.stringify(r.grossHoleScores) === JSON.stringify(currentGrossHoles)
                    );
                    const count = absoluteTies.length;
                    let combinedPercentage = 0;
                    for (let j = 0; j < count; j++) {
                        if (prizeIndex + j < percentages.length) {
                            combinedPercentage += percentages[prizeIndex + j];
                        }
                    }
                    const payoutPerPlayer = (pot * combinedPercentage) / count;
                    if (payoutPerPlayer > 0) {
                        absoluteTies.forEach((t: any) => {
                            finalWinners.push({
                                ...t,
                                score: t[category],
                                gross: category === 'frontNet' ? t.frontGross : category === 'backNet' ? t.backGross : t.totalGross,
                                amount: payoutPerPlayer,
                                position: prizeIndex + 1
                            });
                        });
                    }
                    prizeIndex += count;
                    i += count;
                }
                return finalWinners;
            };

            return {
                ...f,
                results,
                frontWinners: getWinners('frontNet', potFront),
                backWinners: getWinners('backNet', potBack),
                totalWinners: getWinners('totalNet', potTotal),
                pots: { front: potFront, back: potBack, total: potTotal }
            };
        });

        const winningsMap = new Map<string, number>();
        processedFlights.forEach((f: any) => {
            [...f.frontWinners, ...f.backWinners, ...f.totalWinners].forEach((w: any) => {
                const current = winningsMap.get(w.name) || 0;
                winningsMap.set(w.name, current + w.amount);
            });
        });

        // Convert Map to Object or Array for serialization
        const winningsArray = Array.from(winningsMap.entries());

        return {
            success: true,
            data: {
                allPoolParticipants: allPoolParticipants.map(p => ({
                    player_id: p.player_id,
                    player: { name: p.player.name }
                })),
                poolActivePlayers: poolActivePlayers.map(p => ({
                    player_id: p.player_id,
                    player: { name: p.player.name }
                })),
                round: {
                    id: round.id,
                    date: round.date,
                    name: round.name,
                    isTournament: round.isTournament,
                    players: round.players.map((rp: any) => ({
                        id: rp.id,
                        player_id: rp.player_id,
                        player: {
                            id: rp.player.id,
                            name: rp.player.name
                        }
                    }))
                },
                flights,
                processedFlights,
                winningsArray,
                allRounds
            }
        };

    } catch (e) {
        console.error('Error in getPoolResults:', e);
        return { success: false, error: 'Internal server error' };
    }
}
