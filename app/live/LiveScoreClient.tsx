'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { LivePlayerSelectionModal } from '@/components/LivePlayerSelectionModal';
import { LiveRoundModal } from '@/components/LiveRoundModal';
import { createLiveRound, addPlayerToLiveRound, saveLiveScore, deleteLiveRound } from '@/app/actions/create-live-round';

interface Player {
    id: string;
    name: string;
    index: number;
    preferred_tee_box: string | null;
    liveRoundData?: {
        tee_box_name: string | null;
        course_hcp: number | null;
    } | null;
}

interface Hole {
    hole_number: number;
    par: number;
    difficulty?: number | null;
}

interface Course {
    id: string;
    name: string;
    tee_boxes: {
        id: string;
        name: string;
        rating: number;
        slope: number;
    }[];
    holes: Hole[];
}

interface LiveScoreClientProps {
    allPlayers: Player[];
    defaultCourse: Course | null;
    initialRound?: any;
    todayStr: string; // Pass from server to avoid hydration mismatch
    allLiveRounds: Array<{
        id: string;
        name: string;
        date: string;
        created_at: Date;
    }>;
    allCourses: Course[];
}

export default function LiveScoreClient({ allPlayers, defaultCourse, initialRound, todayStr, allLiveRounds, allCourses }: LiveScoreClientProps) {
    const router = useRouter();
    // Initialize State from Server Data
    const [liveRoundId, setLiveRoundId] = useState<string | null>(initialRound?.id || null);

    // Start with empty selection - each device manages its own group
    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);

    const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
    const [roundModalMode, setRoundModalMode] = useState<'new' | 'edit'>('new');

    // Load saved group from localStorage after mount to avoid hydration mismatch
    useEffect(() => {
        try {
            const savedRoundId = localStorage.getItem('live_scoring_last_round_id');
            const currentId = initialRound?.id;

            // If we are on a different round than before, clear the old group selection
            if (currentId && savedRoundId && savedRoundId !== currentId) {
                localStorage.removeItem('live_scoring_my_group');
                localStorage.setItem('live_scoring_last_round_id', currentId);
                setSelectedPlayers([]); // Clear selection for new round
                return;
            }

            if (currentId) {
                localStorage.setItem('live_scoring_last_round_id', currentId);
            }

            const saved = localStorage.getItem('live_scoring_my_group');
            if (saved) {
                const savedIds = JSON.parse(saved);
                // Use allPlayers to reconstruct - don't rely on server round data
                const restored = allPlayers.filter((p: Player) => savedIds.includes(p.id));
                if (restored.length > 0) {
                    setSelectedPlayers(restored);
                } else {
                    setSelectedPlayers([]); // Clear if no valid players found
                }
            } else {
                setSelectedPlayers([]); // No saved data, start empty
            }
        } catch (e) {
            console.error("Failed to load saved players", e);
            setSelectedPlayers([]); // On error, start empty
        }
    }, [initialRound, allPlayers]);

    const [scores, setScores] = useState<Map<string, Map<number, number>>>(() => {
        const initialMap = new Map();
        if (initialRound?.players) {
            initialRound.players.forEach((p: any) => {
                const playerScores = new Map<number, number>();
                if (p.scores) {
                    p.scores.forEach((s: any) => {
                        if (s.hole?.hole_number) {
                            playerScores.set(s.hole.hole_number, s.strokes);
                        }
                    });
                }
                initialMap.set(p.player.id, playerScores);
            });
        }
        return initialMap;
    });




    // Sync local scores with server data when it updates (e.g. after refresh)
    useEffect(() => {
        if (initialRound?.players) {
            setScores(prev => {
                const next = new Map(prev);
                initialRound.players.forEach((p: any) => {
                    // Reconstruct server scores for this player
                    const serverPlayerScores = new Map<number, number>();
                    if (p.scores) {
                        p.scores.forEach((s: any) => {
                            if (s.hole?.hole_number) {
                                serverPlayerScores.set(s.hole.hole_number, s.strokes);
                            }
                        });
                    }
                    // Update local map with server data
                    next.set(p.player.id, serverPlayerScores);
                });
                return next;
            });
        }
    }, [initialRound]);

    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [activeHole, setActiveHole] = useState(() => {
        if (!initialRound?.players || initialRound.players.length === 0) return 1;

        // Find the first hole that isn't fully completed by all participants
        for (let h = 1; h <= 18; h++) {
            const allPlayersHaveScore = initialRound.players.every((p: any) => {
                return p.scores && p.scores.some((s: any) => s.hole?.hole_number === h);
            });

            if (!allPlayersHaveScore) {
                return h;
            }
        }
        return 1;
    });
    const [isAdmin, setIsAdmin] = useState(false);

    // Check admin status
    useEffect(() => {
        const checkAdmin = () => {
            const adminCookie = Cookies.get('admin_session');
            setIsAdmin(adminCookie === 'true');
        };

        checkAdmin();

        // Listen for admin status changes
        window.addEventListener('admin-change', checkAdmin);
        return () => window.removeEventListener('admin-change', checkAdmin);
    }, []);

    // Use todayStr from server to avoid hydration mismatch
    const roundDateStr = initialRound?.date || todayStr;
    const isLocked = todayStr > roundDateStr;
    const canUpdate = isAdmin || !isLocked;

    // Auto-select next available hole for the specific group
    useEffect(() => {
        if (selectedPlayers.length === 0) return;

        for (let h = 1; h <= 18; h++) {
            const allHaveScore = selectedPlayers.every(p => {
                const pScores = scores.get(p.id);
                return pScores && pScores.has(h);
            });
            if (!allHaveScore) {
                setActiveHole(h);
                return;
            }
        }
    }, [selectedPlayers]); // Intentionally not including scores to avoid jumping while scoring

    const activeHolePar = defaultCourse?.holes.find(h => h.hole_number === activeHole)?.par || 4;

    // Helper to split name into first and last
    const splitName = (fullName: string) => {
        const parts = fullName.trim().split(' ');
        if (parts.length === 1) return { first: parts[0], last: '' };
        const last = parts[parts.length - 1];
        const first = parts.slice(0, -1).join(' ');
        return { first, last };
    };

    const getScore = (playerId: string, holeNumber: number): number | null => {
        return scores.get(playerId)?.get(holeNumber) ?? null;
    };

    const getPlayerTee = (player: Player) => {
        if (!defaultCourse) return null;
        if (player.preferred_tee_box) {
            const match = defaultCourse.tee_boxes.find(t => t.name.toLowerCase() === player.preferred_tee_box?.toLowerCase());
            if (match) return match;
            const partial = defaultCourse.tee_boxes.find(t => t.name.toLowerCase().includes(player.preferred_tee_box!.toLowerCase()));
            if (partial) return partial;
        }
        const white = defaultCourse.tee_boxes.find(t => t.name.toLowerCase().includes('white'));
        return white || defaultCourse.tee_boxes[0];
    };

    const getCourseHandicap = (player: Player): number => {
        // Prefer server-side snapshot if available
        if (player.liveRoundData?.course_hcp !== undefined && player.liveRoundData.course_hcp !== null) {
            return player.liveRoundData.course_hcp;
        }

        const teeBox = getPlayerTee(player);
        if (!teeBox) return 0;

        const rating = initialRound?.rating ?? teeBox.rating;
        const slope = initialRound?.slope ?? teeBox.slope;
        const coursePar = initialRound?.par ?? (defaultCourse?.holes.reduce((sum, h) => sum + h.par, 0) || 72);

        const ch = (player.index * slope / 113) + (rating - coursePar);
        return Math.round(ch);
    };

    const handleAddPlayers = async (newSelectedPlayerIds: string[]) => {
        const newSelectedPlayers = allPlayers.filter(p => newSelectedPlayerIds.includes(p.id));
        setSelectedPlayers(newSelectedPlayers);

        // 1. Ensure Live Round Exists (Fallback if server creation failed)
        let currentLiveRoundId = liveRoundId;
        if (!currentLiveRoundId) {
            alert("No active live round found. Please refresh the page.");
            return;
        }

        // 2. Add New Players to DB
        for (const player of newSelectedPlayers) {
            const alreadyExistsInInitialRound = initialRound?.players?.some((p: any) => p.player.id === player.id);
            const alreadyExistsInCurrentState = scores.has(player.id);

            if (!alreadyExistsInInitialRound && !alreadyExistsInCurrentState) {
                const teeBox = getPlayerTee(player);
                if (currentLiveRoundId && teeBox?.id) {
                    await addPlayerToLiveRound({
                        liveRoundId: currentLiveRoundId,
                        playerId: player.id,
                        teeBoxId: teeBox.id
                    });
                }
            }
        }
    };

    const updateScore = (playerId: string, increment: boolean) => {
        if (!liveRoundId) {
            console.warn("No live round ID available to save score.");
            return;
        }

        // Calculate next score based on current state closure
        // This avoids putting side effects (API calls) inside the setState updater
        const currentScore = scores.get(playerId)?.get(activeHole) || activeHolePar;

        let nextScore = increment ? currentScore + 1 : currentScore - 1;
        if (nextScore < 1) nextScore = 1;

        // Update Local State with the new value
        setScores(prev => {
            const newScores = new Map(prev);
            const playerScores = new Map(newScores.get(playerId) || []);
            playerScores.set(activeHole, nextScore);
            newScores.set(playerId, playerScores);
            return newScores;
        });

        // Persist to Server (Side Effect)
        saveLiveScore({
            liveRoundId,
            holeNumber: activeHole,
            playerScores: [{ playerId, strokes: nextScore }]
        });
    };

    // Standardize Persistence logic: 
    // 1. Initial Load (via useState initializer at top)
    // 2. Auto-save on change
    useEffect(() => {
        if (typeof window !== 'undefined' && selectedPlayers.length > 0) {
            localStorage.setItem('live_scoring_my_group', JSON.stringify(selectedPlayers.map(p => p.id)));
        }
    }, [selectedPlayers]);

    // Calculate Summary Players (Union of Server State and Local Selection)
    // Create map from initialRound if available
    const summaryPlayersMap = new Map<string, Player>();
    if (initialRound?.players) {
        initialRound.players.forEach((p: any) => {
            summaryPlayersMap.set(p.player.id, {
                id: p.player.id,
                name: p.player.name,
                index: p.player.index,
                preferred_tee_box: p.player.preferred_tee_box,
                liveRoundData: {
                    tee_box_name: p.tee_box_name,
                    course_hcp: p.course_handicap
                }
            });
        });
    }
    // Add any locally selected players
    selectedPlayers.forEach(p => {
        if (!summaryPlayersMap.has(p.id)) summaryPlayersMap.set(p.id, p);
    });
    const summaryPlayers = Array.from(summaryPlayersMap.values());

    // Calculate Leaderboard Data
    const rankedPlayers = summaryPlayers.map(player => {
        const playerScores = scores.get(player.id);
        let totalGross = 0;
        let strokesReceivedSoFar = 0;
        let parTotal = 0;
        let thru = 0;
        const courseHcp = getCourseHandicap(player);

        const grossHoleScores: { difficulty: number; grossScore: number }[] = [];

        if (playerScores) {
            playerScores.forEach((strokes, holeNum) => {
                totalGross += strokes;
                const hole = defaultCourse?.holes.find(h => h.hole_number === holeNum);
                const holePar = hole?.par || 4;
                const difficulty = hole?.difficulty || holeNum;

                // Collect for tie breaker
                grossHoleScores.push({
                    difficulty,
                    grossScore: strokes
                });

                let holeStrokes = 0;
                if (courseHcp > 0) {
                    const base = Math.floor(courseHcp / 18);
                    const remainder = courseHcp % 18;
                    holeStrokes = base + (difficulty <= remainder ? 1 : 0);
                }
                strokesReceivedSoFar += holeStrokes;

                parTotal += holePar;
                thru++;
            });
        }

        // Sort gross scores by difficulty (1 is hardest) for tie-breaker
        grossHoleScores.sort((a, b) => a.difficulty - b.difficulty);

        const totalNet = totalGross - strokesReceivedSoFar;
        const toPar = totalGross - parTotal;

        return { ...player, totalGross, strokesReceivedSoFar, courseHcp, totalNet, thru, toPar, parTotal, grossHoleScores };
    }).sort((a, b) => {
        // Primary Sort: Total Net (Ascending)
        if (a.totalNet !== b.totalNet) return a.totalNet - b.totalNet;

        // Tie Breaker: Compare Gross Score on hardest holes (Difficulty 1, 2, 3...)
        const len = Math.min(a.grossHoleScores.length, b.grossHoleScores.length);
        for (let i = 0; i < len; i++) {
            if (a.grossHoleScores[i].grossScore !== b.grossHoleScores[i].grossScore) {
                return a.grossHoleScores[i].grossScore - b.grossHoleScores[i].grossScore;
            }
        }

        return 0;
    });

    const activePlayers = rankedPlayers.filter(p => p.thru > 0);
    const allActiveFinished = activePlayers.length > 0 && activePlayers.every(p => p.thru >= 18);
    const allPlayersFinished = rankedPlayers.length > 0 && rankedPlayers.every(p => p.thru >= 18);
    const allPlayersFinishedHole3 = selectedPlayers.length > 0 && selectedPlayers.every(p => scores.get(p.id)?.has(3));
    const hideSettings = allActiveFinished || allPlayersFinishedHole3 || activeHole > 3;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50 px-1 py-1">
                <div className="w-full flex justify-between items-center">
                    <h1 className="text-[16pt] font-bold text-green-700 tracking-tight">Live Scoring</h1>
                    <Link href="/" className="px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors">
                        Home
                    </Link>
                </div>
            </header>

            <main className="w-full px-1 m-0 space-y-1">
                {/* Round Selector - Admin Only */}
                {isAdmin && allLiveRounds.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-1 border-4 border-gray-300">
                        <label className="block text-[14pt] font-bold text-gray-900 mb-2">Select Round:</label>
                        <select
                            value={liveRoundId || ''}
                            onChange={(e) => {
                                if (e.target.value) {
                                    window.location.href = `/live?roundId=${e.target.value}`;
                                }
                            }}
                            className="w-full px-4 py-2 text-[14pt] border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        >
                            <option value="">-- Select a Round --</option>
                            {allLiveRounds.map(round => (
                                <option key={round.id} value={round.id}>
                                    {round.name} - {new Date(round.date).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Course Info Card */}
                <div className="bg-white rounded-xl shadow-lg p-3 border-4 border-gray-300">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-[16pt] font-bold text-gray-900">{defaultCourse?.name || 'Round'}</h2>
                                {isLocked && (
                                    <span className="bg-red-100 text-red-700 text-[10pt] font-black px-2 py-0.5 rounded-full uppercase">Locked</span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-500 mt-1">
                                <span>{initialRound?.date || new Date().toLocaleDateString()}</span>
                                <span>Par: {initialRound?.par ?? defaultCourse?.holes.reduce((a, b) => a + b.par, 0)}</span>
                                <span>R: {initialRound?.rating ?? defaultCourse?.tee_boxes[0]?.rating}</span>
                                <span>S: {initialRound?.slope ?? defaultCourse?.tee_boxes[0]?.slope}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={() => {
                                            setRoundModalMode('new');
                                            setIsRoundModalOpen(true);
                                        }}
                                        className="bg-black text-white text-[12pt] font-bold px-4 py-1.5 rounded-full hover:bg-gray-800 transition-all shadow-md active:scale-95"
                                    >
                                        New
                                    </button>
                                </>
                            )}
                            {canUpdate && !hideSettings && (
                                <button
                                    onClick={() => {
                                        setRoundModalMode('edit');
                                        setIsRoundModalOpen(true);
                                    }}
                                    className="bg-black text-white text-[14pt] font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition-all shadow-md active:scale-95"
                                >
                                    Select Course
                                </button>
                            )}

                            {isAdmin && (
                                <button
                                    onClick={async () => {
                                        console.log('Delete button clicked');
                                        console.log('liveRoundId:', liveRoundId);
                                        console.log('isAdmin:', isAdmin);

                                        if (!liveRoundId) {
                                            console.log('No liveRoundId, returning');
                                            return;
                                        }

                                        console.log('Deleting round...');
                                        try {
                                            console.log('Calling deleteLiveRound...');
                                            await deleteLiveRound(liveRoundId);
                                            console.log('Delete successful, redirecting to home');
                                            window.location.href = '/';
                                        } catch (err) {
                                            console.error('Failed to delete round:', err);
                                            alert('Failed to delete round.');
                                        }
                                    }}
                                    className="bg-red-600 text-white text-[12pt] font-bold px-4 py-1.5 rounded-full hover:bg-red-700 transition-all shadow-md active:scale-95"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <LiveRoundModal
                    isOpen={isRoundModalOpen}
                    onClose={() => setIsRoundModalOpen(false)}
                    courseId={defaultCourse?.id}
                    existingRound={roundModalMode === 'edit' ? initialRound : null}
                    allCourses={allCourses}
                />

                {/* Player Selection Modal */}
                <LivePlayerSelectionModal
                    isOpen={isPlayerModalOpen}
                    onClose={() => setIsPlayerModalOpen(false)}
                    allPlayers={allPlayers}
                    selectedIds={selectedPlayers.map(p => p.id)}
                    playersInRound={initialRound?.players?.map((p: any) => p.player.id) || []}
                    onSelectionChange={handleAddPlayers}
                />

                {/* Scoring Section */}
                {(selectedPlayers.length > 0 || (canUpdate && !hideSettings)) && (
                    <div className="bg-white rounded-xl shadow-lg p-1 border-4 border-gray-300 my-1">
                        {/* Section Header: Group Players */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <h2 className="text-[16pt] font-bold text-gray-900">Group Players</h2>
                            {canUpdate && !hideSettings && (
                                <button
                                    onClick={() => setIsPlayerModalOpen(true)}
                                    className="bg-black text-white rounded-full px-4 py-2 text-[14pt] font-bold shadow-md hover:bg-gray-800 active:scale-95 transition-all"
                                >
                                    Select Players
                                </button>
                            )}
                        </div>

                        {/* Hole Selection Grid */}
                        {selectedPlayers.length > 0 && (
                            <div className="mb-1">
                                <div className="grid grid-cols-6 gap-1">
                                    {defaultCourse?.holes.map(hole => {
                                        // Check if this hole has been saved (has scores)
                                        const isSaved = selectedPlayers.some(p => {
                                            const pScores = scores.get(p.id);
                                            return pScores && pScores.has(hole.hole_number);
                                        });

                                        const isActive = activeHole === hole.hole_number;

                                        // Determine styling
                                        let btnClass = "bg-white text-black border border-gray-200 hover:bg-gray-50"; // Default (Blank on White)
                                        if (isActive) {
                                            btnClass = "bg-[#059669] text-white shadow-md scale-105 z-10";
                                        } else if (isSaved) {
                                            btnClass = "bg-gray-400 text-white border border-gray-400 shadow-sm";
                                        }

                                        return (
                                            <button
                                                key={hole.hole_number}
                                                onClick={() => setActiveHole(hole.hole_number)}
                                                className={`
                                                flex items-center justify-center font-bold text-[14pt] px-1 py-2 rounded-full transition-all whitespace-nowrap
                                                ${btnClass}
                                            `}
                                            >
                                                {hole.hole_number}/{hole.par}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Player Scoring Rows */}
                        {selectedPlayers.length > 0 ? (
                            <div className="space-y-1">
                                {[...selectedPlayers]
                                    .sort((a, b) => {
                                        const firstA = splitName(a.name).first.toLowerCase();
                                        const firstB = splitName(b.name).first.toLowerCase();
                                        return firstA.localeCompare(firstB);
                                    })
                                    .map(player => {
                                        const score = getScore(player.id, activeHole);
                                        // Calculate Totals for To Par
                                        const pScores = scores.get(player.id);
                                        let totalScore = 0;
                                        let totalScoredPar = 0;
                                        if (pScores) {
                                            pScores.forEach((strokes, hNum) => {
                                                totalScore += strokes;
                                                const hPar = defaultCourse?.holes.find(h => h.hole_number === hNum)?.par || 4;
                                                totalScoredPar += hPar;
                                            });
                                        }
                                        const diff = totalScore - totalScoredPar;
                                        let toParStr = "E";
                                        let toParClass = "text-green-600";
                                        if (diff > 0) {
                                            toParStr = `+${diff}`;
                                            toParClass = "text-gray-900";
                                        } else if (diff < 0) {
                                            toParStr = `${diff}`;
                                            toParClass = "text-red-600";
                                        }

                                        const courseHcp = getCourseHandicap(player);

                                        return (
                                            <div key={player.id} className="flex justify-between items-center bg-gray-50 rounded-xl p-1">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col items-start">
                                                            <div className="font-bold text-gray-900 text-[18pt] leading-tight">{splitName(player.name).first}</div>
                                                            <div className="text-gray-700 text-[14pt] leading-tight">{splitName(player.name).last}</div>
                                                        </div>
                                                        {pScores && pScores.size >= 18 && (
                                                            <span className="text-[20pt]" title="Finished">🏁</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {canUpdate && (
                                                        <button
                                                            onClick={() => updateScore(player.id, false)}
                                                            className="w-12 h-12 rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-bold shadow-md active:scale-95 transition-transform text-[17pt]"
                                                        >
                                                            -
                                                        </button>
                                                    )}
                                                    <div className="w-16 text-center font-bold text-[33pt] text-gray-800">
                                                        {score || <span className="text-gray-800">{activeHolePar}</span>}
                                                    </div>
                                                    {canUpdate && (
                                                        <button
                                                            onClick={() => updateScore(player.id, true)}
                                                            className="w-12 h-12 rounded-full bg-[#00c950] flex items-center justify-center text-white font-bold shadow-md active:scale-95 transition-transform text-[17pt]"
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : null}

                        {/* Save Hole Button */}
                        {selectedPlayers.length > 0 && canUpdate && (
                            <button
                                onClick={() => {
                                    if (!liveRoundId) return;

                                    const updates: { playerId: string; strokes: number }[] = [];
                                    const newScores = new Map(scores); // Use current render state

                                    selectedPlayers.forEach(p => {
                                        const playerScores = new Map(newScores.get(p.id) || []);
                                        // If no score exists for this hole, default to Par
                                        if (!playerScores.has(activeHole)) {
                                            playerScores.set(activeHole, activeHolePar);
                                            updates.push({ playerId: p.id, strokes: activeHolePar });
                                        }
                                        newScores.set(p.id, playerScores);
                                    });

                                    if (updates.length > 0) {
                                        // Update UI
                                        setScores(newScores);
                                        // Save to Server
                                        saveLiveScore({
                                            liveRoundId,
                                            holeNumber: activeHole,
                                            playerScores: updates
                                        });
                                    }

                                    if (activeHole < 18) {
                                        setActiveHole(activeHole + 1);
                                    } else {
                                        // After 18th hole, find the first hole that has missing scores
                                        let nextHole = 1;
                                        for (let h = 1; h <= 18; h++) {
                                            const isHoleIncomplete = selectedPlayers.some(p => {
                                                const pScores = newScores.get(p.id);
                                                return !pScores || !pScores.has(h);
                                            });

                                            if (isHoleIncomplete) {
                                                nextHole = h;
                                                break;
                                            }
                                        }
                                        setActiveHole(nextHole);
                                    }

                                    // Silent refresh to keep server data in sync without flashing the page
                                    router.refresh();
                                }}
                                className="w-full bg-black hover:bg-gray-800 text-white font-bold px-1 py-2 rounded-full shadow-sm transition-colors text-[14pt] flex items-center justify-center gap-2 mt-2"
                            >
                                Save Hole {activeHole}
                            </button>
                        )}
                    </div>
                )}

                {/* Live Scores Summary */}
                {summaryPlayers.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <button
                            onClick={() => router.refresh()}
                            className="w-full bg-black text-white rounded-full py-2 text-[14pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                        >
                            Summary - Refresh
                        </button>

                        <div className="space-y-1">
                            {rankedPlayers.map((p, i) => {
                                let toParStr = "E";
                                let toParClass = "text-green-600";
                                if (p.toPar > 0) {
                                    toParStr = `+${p.toPar}`;
                                    toParClass = "text-gray-900";
                                } else if (p.toPar < 0) {
                                    toParStr = `${p.toPar}`;
                                    toParClass = "text-red-600";
                                }

                                let medalIcon = null;
                                if (p.thru >= 18) {
                                    if (allActiveFinished) {
                                        if (i === 0) medalIcon = "🥇";
                                        else if (i === 1) medalIcon = "🥈";
                                        else if (i === 2) medalIcon = "🥉";
                                        else medalIcon = "🏁";
                                    } else {
                                        medalIcon = "🏁";
                                    }
                                }

                                return (
                                    <div key={p.id} className="bg-white shadow-lg rounded-xl overflow-hidden my-1 border-4 border-gray-300">
                                        {/* Player Header */}
                                        <div className="bg-[#1d4ed8] p-1 text-white">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-white text-[#1d4ed8] font-bold rounded w-8 h-8 flex items-center justify-center text-[14pt]">
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex flex-col">
                                                                <div className="font-bold text-[14pt] leading-tight">{splitName(p.name).first}</div>
                                                                <div className="text-[12pt] leading-tight opacity-90">{splitName(p.name).last}</div>
                                                            </div>
                                                            {medalIcon && (
                                                                <span className="text-[16pt]" title="Finished">{medalIcon}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 items-center">
                                                    <div className={`bg-white font-bold rounded px-2 h-8 flex items-center justify-center text-[14pt] min-w-[3rem] ${toParClass}`}>
                                                        {toParStr}
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-[14pt] opacity-80 font-bold tracking-wider">GRS</div>
                                                        <div className="text-[14pt] font-bold leading-none">{p.totalGross}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[14pt] opacity-80 font-bold tracking-wider">HCP</div>
                                                        <div className="text-[14pt] font-bold leading-none">{p.strokesReceivedSoFar}/{p.courseHcp}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[14pt] opacity-80 font-bold tracking-wider">NET</div>
                                                        <div className="text-[14pt] font-bold leading-none">{p.totalNet}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score Grid */}
                                        <div className="m-1 border border-black rounded shadow-sm overflow-hidden">
                                            {/* Row 1: Holes 1-9 */}
                                            <div className="grid grid-cols-9 border-b border-black">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                                    const score = getScore(p.id, num);
                                                    const isActive = activeHole === num;
                                                    const hole = defaultCourse?.holes.find(h => h.hole_number === num);
                                                    const holePar = hole?.par || 4;

                                                    let bgClass = "bg-white";
                                                    if (score !== null) {
                                                        const diff = score - holePar;
                                                        if (diff <= -2) bgClass = "bg-yellow-300";
                                                        else if (diff === -1) bgClass = "bg-green-300";
                                                        else if (diff === 0) bgClass = "bg-blue-50";
                                                        else if (diff === 1) bgClass = "bg-orange-200";
                                                        else if (diff >= 2) bgClass = "bg-red-200";
                                                    } else if (isActive) {
                                                        bgClass = "bg-green-50";
                                                    }

                                                    return (
                                                        <div key={num} className={`
                                                            flex flex-col items-center justify-center h-16 border-r border-black last:border-r-0 relative bg-white
                                                            ${isActive ? 'ring-2 ring-green-600 ring-inset z-10' : ''}
                                                        `}>
                                                            <div className="text-[12pt] text-gray-500 mb-1">{num}</div>
                                                            <div className={`text-[14pt] font-bold px-2 py-0.5 rounded ${bgClass} ${score !== null ? 'text-gray-900' : 'text-transparent'}`}>
                                                                {score || '-'}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {/* Row 2: Holes 10-18 */}
                                            <div className="grid grid-cols-9">
                                                {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => {
                                                    const score = getScore(p.id, num);
                                                    const isActive = activeHole === num;
                                                    const hole = defaultCourse?.holes.find(h => h.hole_number === num);
                                                    const holePar = hole?.par || 4;

                                                    let bgClass = "bg-white";
                                                    if (score !== null) {
                                                        const diff = score - holePar;
                                                        if (diff <= -2) bgClass = "bg-yellow-300";
                                                        else if (diff === -1) bgClass = "bg-green-300";
                                                        else if (diff === 0) bgClass = "bg-blue-50";
                                                        else if (diff === 1) bgClass = "bg-orange-200";
                                                        else if (diff >= 2) bgClass = "bg-red-200";
                                                    } else if (isActive) {
                                                        bgClass = "bg-green-50";
                                                    }

                                                    return (
                                                        <div key={num} className={`
                                                            flex flex-col items-center justify-center h-16 border-r border-black last:border-r-0 relative bg-white
                                                            ${isActive ? 'ring-2 ring-green-600 ring-inset z-10' : ''}
                                                        `}>
                                                            <div className="text-[12pt] text-gray-500 mb-1">{num}</div>
                                                            <div className={`text-[14pt] font-bold px-2 py-0.5 rounded ${bgClass} ${score !== null ? 'text-gray-900' : 'text-transparent'}`}>
                                                                {score || '-'}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
                }

                {/* Score Legend */}
                {
                    selectedPlayers.length > 0 && (
                        <div className="bg-white rounded-xl shadow-lg p-1 mt-1 flex flex-wrap gap-1 items-center justify-center text-[14pt]">
                            <div className="font-bold text-gray-700 mr-1 text-[14pt]">Score Legend</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-300"></div>Eagle (-2)</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-300"></div>Birdie (-1)</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-50 border border-gray-200"></div>Par (E)</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-200"></div>Bogey (+1)</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-200"></div>Double+ (+2)</div>
                        </div>
                    )
                }

                {/* Save Round Button - Admin Only */}
                {
                    isAdmin && liveRoundId && selectedPlayers.length > 0 && (
                        <button
                            onClick={async () => {
                                if (confirm('Save this round? This will finalize all scores. This data is isolated and will NOT affect handicaps or main scores.')) {
                                    alert('Round saved successfully! Note: This is a live scoring session only and does not affect official handicaps.');
                                    window.location.reload();
                                }
                            }}
                            className="w-full bg-black hover:bg-gray-800 text-white font-bold px-1 py-2 rounded-full shadow-lg transition-colors text-[14pt] mt-1 mb-1"
                        >
                            💾 Save Round
                        </button>
                    )
                }
            </main >
        </div >
    );
}
