import { prisma } from '@/lib/prisma';
// Forced refresh: 2025-12-23T16:29:00
import Link from 'next/link';
import { cookies } from 'next/headers';
import { format } from 'date-fns';
import CreateRoundButton from '@/components/CreateRoundButton';
import RefreshButton from '@/components/RefreshButton';
import ScoresDashboard from '@/components/ScoresDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Revalidate every 30 seconds


export default async function ScoresPage() {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    const yearStart = format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd');

    let rounds: any[] = [];
    let debugError: any = null;

    try {
        // Optimized query: Only select fields we actually need
        rounds = await prisma.round.findMany({
            orderBy: {
                date: 'desc',
            },
            select: {
                id: true,
                date: true,
                name: true,
                isTournament: true,
                course: {
                    select: {
                        holes: {
                            select: {
                                holeNumber: true,
                                par: true,
                                // difficulty: true // Removed from simplified schema
                            }
                        },
                        teeBoxes: {
                            select: {
                                name: true,
                                rating: true,
                                slope: true
                            }
                        }
                    }
                },
                players: {
                    select: {
                        id: true,
                        grossScore: true,
                        frontNine: true,
                        backNine: true,
                        // indexAtTime: true, // Removed from RoundPlayer in simplified schema? No indexAtTime on RoundPlayer anymore, check user requirement? 
                        // Simplified schema RoundPlayer: id, roundId, playerId, teeBoxId, name, grossScore, courseHandicap, netScore, frontNine, backNine
                        // We must fetch Player.handicapIndex for "index at time" effectively (or assume it hasn't changed much if we don't store history properly yet)
                        // Actually, simplified schema removed detailed historical index. We will just use player.handicapIndex for now or handle it.
                        // Wait, check schema again. RoundPlayer has `courseHandicap`.
                        courseHandicap: true,
                        netScore: true,
                        playerId: true,
                        player: {
                            select: {
                                id: true,
                                name: true,
                                handicapIndex: true, // Replaced index
                                email: true,
                                // preferred_tee_box: true // Removed
                            }
                        },
                        teeBox: {
                            select: {
                                name: true,
                                slope: true,
                                rating: true
                            }
                        },
                        // Don't load scores here - they'll be loaded on-demand when scorecard is clicked
                        scores: {
                            select: {
                                strokes: true,
                                hole: {
                                    select: {
                                        holeNumber: true,
                                        // difficulty: true // Removed
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        grossScore: 'asc',
                    },
                },
            },
        });
    } catch (error: any) {
        console.error('Failed to fetch rounds:', error);
        // Mask the password for display
        const dbUrl = process.env.DATABASE_URL || 'MISSING';
        const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
        debugError = {
            message: error.message,
            stack: error.stack,
            urlUsed: maskedUrl
        };
    }

    // Build YTD winnings and points as a RUNNING TOTAL progression
    const runningWinnings = new Map<string, number>();
    const runningPoints = new Map<string, number>();
    const currentYear = new Date().getFullYear();

    // Sort rounds oldest to newest to calculate progression
    const sortedRounds = [...rounds].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Track processing year to reset YTD stats
    let processingYear = currentYear;
    if (sortedRounds.length > 0) {
        processingYear = new Date(sortedRounds[0].date).getFullYear();
    }

    // Maps to store the snapshot total for each player at each round
    const roundSnapshots = new Map<string, Map<string, { pts: number; money: number }>>();

    sortedRounds.forEach((round: any) => {
        const roundYear = new Date(round.date).getFullYear();

        // If we moved to a new year, reset YTD stats
        if (roundYear !== processingYear) {
            runningWinnings.clear();
            runningPoints.clear();
            processingYear = roundYear;
        }

        const snapshots = new Map<string, { pts: number; money: number }>();

        // 1. Process Winnings (Payout field removed from simplified schema, treating as 0 for now)
        (round.players || []).forEach((rp: any) => {
            const currentMoney = (runningWinnings.get(rp.playerId) || 0) + 0; // rp.payout was removed
            runningWinnings.set(rp.playerId, currentMoney);
        });

        // 2. Process Points (Tournament Only)
        if (round.isTournament) {
            const par = round.course.holes.reduce((sum: number, h: any) => sum + h.par, 0);
            const sortedPlayers = [...(round.players || [])].sort((a: any, b: any) => {
                const idxA = a.player?.handicapIndex ?? 0;
                const idxB = b.player?.handicapIndex ?? 0;
                return idxA - idxB;
            });

            let flights: any[][] = [];
            if (sortedPlayers.length > 0) {
                const half = Math.floor(sortedPlayers.length / 2);
                flights = [sortedPlayers.slice(0, half), sortedPlayers.slice(half)];
            }

            flights.forEach((flight: any) => {
                const scoredPlayers = flight.map((rp: any) => {
                    if (!rp.grossScore) return { ...rp, net: 9999 };
                    // Recalculate net if needed, or use stored netScore
                    // Using stored netScore is safer if available
                    if (rp.netScore) return { ...rp, net: rp.netScore };

                    // Fallback calc
                    const idx = rp.player?.handicapIndex ?? 0;
                    const slope = rp.teeBox?.slope ?? 113;
                    const rating = rp.teeBox?.rating ?? par;
                    const ch = Math.round(idx * (slope / 113) + (rating - par));
                    return { ...rp, net: rp.grossScore - ch };
                }).sort((a: any, b: any) => a.net - b.net);

                scoredPlayers.forEach((p: any, rank: number) => {
                    if (p.net === 9999) return;
                    let pts = 20;
                    if (rank === 0) pts = 100;
                    else if (rank === 1) pts = 75;
                    else if (rank === 2) pts = 50;

                    const currentPts = (runningPoints.get(p.playerId) || 0) + pts;
                    runningPoints.set(p.playerId, currentPts);
                });
            });
        }

        // 3. Take snapshot for this round
        (round.players || []).forEach((rp: any) => {
            snapshots.set(rp.playerId, {
                pts: runningPoints.get(rp.playerId) || 0,
                money: runningWinnings.get(rp.playerId) || 0
            });
        });
        roundSnapshots.set(round.id, snapshots);
    });

    // Final mapping for display (rounds are already in correct order from findMany)
    const processedRounds = (rounds as any[]).map((round: any) => {
        const snapshots = roundSnapshots.get(round.id);
        return {
            ...round,
            players: (round.players || []).map((rp: any) => {
                const stats = snapshots?.get(rp.playerId);
                return {
                    ...rp,
                    ytdWinnings: stats?.money || 0,
                    ytdPoints: stats?.pts || 0
                };
            })
        };
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50 px-1 py-3">
                <div className="flex items-center justify-between p-1">
                    <h1 className="text-[18pt] font-bold text-green-700 tracking-tight text-left ml-3">Scores</h1>
                    <Link href="/" className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95">Home</Link>
                </div>
            </header>

            <main className="px-1 py-6 space-y-6">
                {/* Debug Error Display */}
                {debugError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm break-words mb-4">
                        <h3 className="font-bold mb-1">Database Connection Error:</h3>
                        <p className="mb-2 text-xs font-mono bg-red-100 p-1 rounded">URL: {debugError.urlUsed}</p>
                        <pre className="whitespace-pre-wrap font-mono text-xs">{debugError.message || JSON.stringify(debugError, null, 2)}</pre>
                        <p className="mt-2 text-xs text-gray-500">Please check Vercel Environment Variables.</p>
                    </div>
                )}
                {/* Action Bar - Admin Only */}
                {isAdmin && (
                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                        <CreateRoundButton />
                        <RefreshButton />
                    </div>
                )}

                {/* Rounds Feed with Pagination */}
                <ScoresDashboard rounds={processedRounds as any} isAdmin={isAdmin} />
            </main>
        </div>
    );
}
