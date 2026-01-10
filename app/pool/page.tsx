import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { format } from 'date-fns';
import { PoolCopyButton } from '@/components/PoolCopyButton';
import { PoolDateSelector } from '@/components/PoolDateSelector';
import { PoolManagementButton } from '@/components/PoolManagementButton';
import { SaveWinningsButton } from '@/components/SaveWinningsButton';
import PoolResults from '@/components/PoolResults'; // Import the client component
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

interface Winner {
    playerId: string;
    name: string;
    score: number; // Net score
    hcp: number; // Course Handicap
    gross: number;
    amount: number;
}

export default async function PoolPage(props: { searchParams: Promise<{ roundId?: string }> }) {
    const searchParams = await props.searchParams;
    const selectedRoundId = searchParams.roundId;

    // Check admin status
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    // 1. Initialize Safe Defaults
    let allRounds: any[] = [];
    let everyPlayer: any[] = [];
    let round: any = null;
    let poolStatusMap = new Map();

    try {
        // 1a. Fetch all round dates for selector
        allRounds = await prisma.round.findMany({
            orderBy: { date: 'desc' },
            select: {
                date: true,
                id: true,
                is_tournament: true,
                name: true,
                _count: {
                    select: { players: true }
                }
            }
        });

        // 1aa. Fetch all available players for the management modal
        everyPlayer = await prisma.player.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        });

        // 1b. Fetch Round (Specific ID or Latest)
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

        if (selectedRoundId) {
            round = await prisma.round.findUnique({
                where: { id: selectedRoundId },
                include: includeOpts
            });
        } else {
            // Default: Find the latest round that actually has players in the pool
            // Using raw query to bypass potential Prisma Client validation issues with 'in_pool' caching
            try {
                const result = await prisma.$queryRaw<{ id: string }[]>`
                    SELECT r.id
                    FROM rounds r
                    JOIN round_players rp ON r.id = rp.round_id
                    WHERE rp.in_pool = true
                    ORDER BY r.date DESC
                    LIMIT 1
                `;

                if (result.length > 0) {
                    round = await prisma.round.findUnique({
                        where: { id: result[0].id },
                        include: includeOpts
                    });
                }
            } catch (e) {
                console.error("Error finding pool round via raw query:", e);
            }

            // Fallback: If no pool rounds exist yet, just show the latest round
            if (!round) {
                round = await prisma.round.findFirst({
                    orderBy: { date: 'desc' },
                    include: includeOpts
                });
            }
        }

        // 1c. Fetch in_pool status via Raw SQL (to bypass potential stale Prisma Client cache)
        if (round) {
            const poolStatusRaw = await prisma.$queryRaw<{ player_id: string, in_pool: boolean }[]>`
                SELECT player_id, in_pool FROM round_players WHERE round_id = ${round.id}
            `;
            poolStatusMap = new Map(poolStatusRaw.map((p: any) => [p.player_id, Boolean(p.in_pool)]));
        }

    } catch (e) {
        console.error("Failed to fetch pool data:", e);
    }

    // 2. Setup Calculations
    const playersRaw = round.players as any[];

    // 2a. All identified participants
    // We use the raw SQL map to guarantee we see the DB state
    const allPoolParticipants = playersRaw.filter((rp: any) => {
        const rawStatus = poolStatusMap.get(rp.player_id);
        return rawStatus === true;
    });

    // 2b. Participants ready for calculation (have scores and tee box)
    const poolActivePlayers = allPoolParticipants.filter((rp: any) => rp.tee_box && rp.gross_score !== null);

    // Debugging

    // Sort active players by index for flighting
    const sortedPlayers = [...poolActivePlayers].sort((a, b) => {
        const indexA = a.index_at_time ?? a.player.index;
        const indexB = b.index_at_time ?? b.player.index;
        return indexA - indexB;
    });

    // Determine Flights
    let flights: { name: string, players: any[], pot: number }[] = [];
    const entryFee = 5.00;
    const totalPot = allPoolParticipants.length * entryFee;

    flights = [
        { name: "All Players", players: poolActivePlayers, pot: totalPot }
    ];

    // Calculate Par
    const par = round.course?.holes.reduce((sum: number, h: any) => sum + h.par, 0) || 72;

    // Helper to calc net
    const calc = (rp: any) => {
        // Matching logic from ScoresDashboard to ensure consistent Handicaps
        const index = rp.index_at_time ?? rp.player.index;
        const slope = rp.tee_box?.slope || 113;
        const rating = rp.tee_box?.rating || par;

        // Formula: (Index * (Slope/113)) + (Rating - Par)
        const courseHcp = Math.round((index * (slope / 113)) + (rating - par));

        // Calculate Front/Back from scores if not present on record
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

        // Fallback to estimation only if absolutely no score data
        frontGross = frontGross ?? Math.floor(rp.gross_score / 2);
        backGross = backGross ?? Math.ceil(rp.gross_score / 2);
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

        // Calculate Gross Hole Scores for Tie Breakers (sorted by difficulty)
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

    // Process each flight
    const processedFlights = flights.map((f: any) => {
        const results = f.players.map(calc);
        const potFront = f.pot * 0.40;
        const potBack = f.pot * 0.40;
        const potTotal = f.pot * 0.20;

        const getWinners = (category: 'frontNet' | 'backNet' | 'totalNet', pot: number) => {
            if (results.length === 0 || pot <= 0) return [];

            // 1. Sort by Main Score + Tie Breaker
            const sorted = [...results].sort((a: any, b: any) => {
                if (a[category] !== b[category]) return a[category] - b[category];

                // Tie Breaker: Use hardest holes by Gross Score (difficulty 1, 2, 3...)
                const filter = (h: any) => {
                    if (category === 'frontNet') return h.holeNumber <= 9;
                    if (category === 'backNet') return h.holeNumber > 9;
                    return true;
                };

                const aHoles = a.grossHoleScores.filter(filter);
                const bHoles = b.grossHoleScores.filter(filter);

                // Both should be same length and already sorted by difficulty in calc()
                for (let i = 0; i < aHoles.length; i++) {
                    if (aHoles[i].grossScore !== bHoles[i].grossScore) {
                        return aHoles[i].grossScore - bHoles[i].grossScore;
                    }
                }
                return 0;
            });

            // 2. Distribute Prizes (1st: 50%, 2nd: 30%, 3rd: 20%)
            const percentages = [0.5, 0.3, 0.2];
            const finalWinners: any[] = [];

            let prizeIndex = 0;
            let i = 0;
            while (prizeIndex < percentages.length && i < sorted.length) {
                const currentScore = sorted[i][category];
                const currentGrossHoles = sorted[i].grossHoleScores;

                // Find absolute ties (exact same score AND exact same gross holes)
                // These players must split the prizes belonging to their rank range
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

    // Winnings Map for Summary
    const winningsMap = new Map<string, number>();
    processedFlights.forEach((f: any) => {
        [...f.frontWinners, ...f.backWinners, ...f.totalWinners].forEach((w: any) => {
            const current = winningsMap.get(w.name) || 0;
            winningsMap.set(w.name, current + w.amount);
        });
    });

    return (
        <div className="min-h-screen bg-white font-sans text-[#111] pb-10">
            {/* Header Actions */}
            <header className="bg-white shadow-sm sticky top-0 z-50 px-1 py-3">
                <div className="flex items-center justify-between p-1">
                    <h1 className="text-[18pt] font-black text-green-600 tracking-tight text-left ml-3">$5 Pool</h1>
                    <Link href="/" className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-sm">
                        Home
                    </Link>
                </div>
            </header>

            <main className="px-1 py-6">

                {/* Date Selection Bar */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-1 flex items-center justify-between gap-1 mb-6 shadow-sm">
                    <PoolDateSelector
                        allRounds={allRounds}
                        currentRoundId={round.id}
                    />
                    {isAdmin && (
                        <div className="flex gap-1 shrink-0">
                            <PoolCopyButton
                                date={round.date}
                                roundName={round.name}
                                isTournament={round.is_tournament}
                                flights={processedFlights}
                            />
                            <button className="p-2.5 bg-black rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-white cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Results Dashboard */}
                <div className="border border-gray-300 rounded-2xl overflow-hidden shadow-xl bg-white">

                    {/* Participants Header */}
                    <div className="bg-[#f3f4fa] border-b border-gray-300 px-1 py-4 flex justify-between items-center">
                        <h2 className="text-[14pt] font-bold text-gray-700">Pool Participants</h2>
                        <PoolManagementButton
                            roundId={round.id}
                            allPlayers={round.players.map((p: any) => ({ id: p.player_id, name: p.player.name }))}
                            currentParticipantIds={allPoolParticipants.map((p: any) => p.player_id)}
                        />
                    </div>

                    <PoolResults
                        allPoolParticipants={allPoolParticipants}
                        poolActivePlayers={poolActivePlayers}
                        round={round}
                        flights={flights}
                        processedFlights={processedFlights}
                        winningsMap={winningsMap}
                    />
                </div>
            </main>
        </div>
    );
}
