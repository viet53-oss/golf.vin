'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LivePlayerSelectionModal } from '@/components/LivePlayerSelectionModal';
import { createLiveRound, addPlayerToLiveRound, saveLiveScore } from '@/app/actions/create-live-round';

interface Player {
    id: string;
    name: string;
    index: number;
    preferred_tee_box: string | null;
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
}

export default function LiveScoreClient({ allPlayers, defaultCourse, initialRound }: LiveScoreClientProps) {
    // Initialize State from Server Data
    const [liveRoundId, setLiveRoundId] = useState<string | null>(initialRound?.id || null);

    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>(() => {
        // Try to load from Local Storage first
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('live_scoring_my_group');
                if (saved) {
                    const savedIds = JSON.parse(saved);
                    // Reconstruct player objects from available data
                    const sourcePlayers = initialRound?.players
                        ? initialRound.players.map((p: any) => ({
                            id: p.player.id,
                            name: p.player.name,
                            index: p.player.index,
                            preferred_tee_box: p.player.preferred_tee_box
                        }))
                        : allPlayers;

                    const restored = sourcePlayers.filter((p: Player) => savedIds.includes(p.id));
                    if (restored.length > 0) return restored;
                }
            } catch (e) {
                console.error("Failed to load saved players", e);
            }
        }

        // Fallback to all players in round
        if (initialRound?.players) {
            return initialRound.players.map((p: any) => ({
                id: p.player.id,
                name: p.player.name,
                index: p.player.index,
                preferred_tee_box: p.player.preferred_tee_box
            }));
        }
        return [];
    });

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
        const teeBox = getPlayerTee(player);
        if (!teeBox) return 0;

        const rating = teeBox.rating;
        const slope = teeBox.slope;
        const coursePar = defaultCourse?.holes.reduce((sum, h) => sum + h.par, 0) || 72;

        const ch = (player.index * slope / 113) + (rating - coursePar);
        return Math.round(ch);
    };

    const handleAddPlayers = async (newSelectedPlayerIds: string[]) => {
        const newSelectedPlayers = allPlayers.filter(p => newSelectedPlayerIds.includes(p.id));
        setSelectedPlayers(newSelectedPlayers);

        // 1. Ensure Live Round Exists
        let currentLiveRoundId = liveRoundId;
        if (!currentLiveRoundId) {
            if (!defaultCourse) return;
            const res = await createLiveRound({
                name: `Live Round ${new Date().toLocaleDateString()}`,
                date: new Date().toISOString(),
                courseId: defaultCourse.id
            });
            if (res.success && res.liveRoundId) {
                currentLiveRoundId = res.liveRoundId;
                setLiveRoundId(currentLiveRoundId);
            } else {
                console.error("Failed to create live round");
                return;
            }
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
                preferred_tee_box: p.player.preferred_tee_box
            });
        });
    }
    // Add any locally selected players
    selectedPlayers.forEach(p => {
        if (!summaryPlayersMap.has(p.id)) summaryPlayersMap.set(p.id, p);
    });
    const summaryPlayers = Array.from(summaryPlayersMap.values());

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="w-full px-1 py-3 flex justify-between items-center">
                    <h1 className="text-[16pt] font-bold text-green-700 tracking-tight">Live Scoring</h1>
                    <Link href="/" className="px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors">
                        Back
                    </Link>
                </div>
            </header>

            <main className="w-full px-1 py-1 space-y-4">
                {/* Course Info Card */}
                <div className="bg-white rounded-xl shadow-lg p-1 border-4 border-gray-300">
                    <h2 className="text-[14pt] font-bold text-gray-900">{defaultCourse?.name || 'Loading...'}</h2>
                    <div className="flex gap-4 text-[14pt] text-gray-500 mt-1">
                        <span>Date: {new Date().toLocaleDateString()}</span>
                        <span>Par: {defaultCourse?.holes.reduce((a, b) => a + b.par, 0)}</span>
                        <span>Rating: {defaultCourse?.tee_boxes[0]?.rating}</span>
                        <span>Slope: {defaultCourse?.tee_boxes[0]?.slope}</span>
                    </div>
                </div>

                {/* Player Selection Modal */}
                <LivePlayerSelectionModal
                    isOpen={isPlayerModalOpen}
                    onClose={() => setIsPlayerModalOpen(false)}
                    allPlayers={allPlayers}
                    selectedIds={selectedPlayers.map(p => p.id)}
                    onSelectionChange={handleAddPlayers}
                />

                {/* Scoring Section */}
                <div className="bg-white rounded-xl shadow-lg p-1 border-4 border-gray-300">
                    <div className="flex justify-between items-center mb-4 px-1 border-b border-gray-100 pb-2">
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-[14pt] font-bold text-gray-900">Group Players</h3>
                        </div>
                        <button
                            onClick={() => setIsPlayerModalOpen(true)}
                            className="bg-black text-white text-[14pt] font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            Select players
                        </button>
                    </div>

                    {/* Hole Selection Grid */}
                    {selectedPlayers.length > 0 && (
                        <div className="mb-6">
                            <div className="grid grid-cols-6 gap-2">
                                {defaultCourse?.holes.map(hole => {
                                    // Check if this hole has been saved (has scores)
                                    const isSaved = selectedPlayers.some(p => {
                                        const pScores = scores.get(p.id);
                                        return pScores && pScores.has(hole.hole_number);
                                    });

                                    const isActive = activeHole === hole.hole_number;

                                    // Determine styling
                                    let btnClass = "bg-gray-100 text-gray-600 hover:bg-gray-200"; // Default
                                    if (isActive) {
                                        btnClass = "bg-green-600 text-white shadow-md scale-105 z-10";
                                    } else if (isSaved) {
                                        btnClass = "bg-black text-white border-2 border-gray-800 shadow-sm";
                                    }

                                    return (
                                        <button
                                            key={hole.hole_number}
                                            onClick={() => setActiveHole(hole.hole_number)}
                                            className={`
                                                h-12 rounded-lg flex items-center justify-center font-bold text-[14pt] transition-all whitespace-nowrap
                                                ${btnClass}
                                            `}
                                        >
                                            <div className="flex items-baseline justify-center font-bold px-1">
                                                <span className="text-[20pt]">{hole.hole_number}</span>
                                                <span className="text-[18pt] mx-0">/</span>
                                                <span className="text-[18pt]">{hole.par}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Player Scoring Rows */}
                    {selectedPlayers.length > 0 ? (
                        <div className="space-y-4">
                            {selectedPlayers.map(player => {
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
                                    <div key={player.id} className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                                        <div className="flex flex-col">
                                            <div className="flex flex-col items-start">
                                                <div className="font-bold text-gray-900 text-[18pt] leading-tight">{splitName(player.name).first}</div>
                                                <div className="text-gray-700 text-[14pt] leading-tight">{splitName(player.name).last}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => updateScore(player.id, false)}
                                                className="w-14 h-14 rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-bold shadow-md active:scale-95 transition-transform text-[30pt]"
                                            >
                                                -
                                            </button>
                                            <div className="w-16 text-center font-bold text-[30pt] text-gray-800">
                                                {score || <span className="text-gray-800">{activeHolePar}</span>}
                                            </div>
                                            <button
                                                onClick={() => updateScore(player.id, true)}
                                                className="w-14 h-14 rounded-full bg-[#00c950] flex items-center justify-center text-white font-bold shadow-md active:scale-95 transition-transform text-[30pt]"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            Tap "Add Players" to start scoring.
                        </div>
                    )}

                    {/* Save Hole Button */}
                    {selectedPlayers.length > 0 && (
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
                                    // Refresh page after saving the last hole
                                    setTimeout(() => window.location.reload(), 500);
                                }

                                // Refresh to update summary section
                                setTimeout(() => window.location.reload(), 500);
                            }}
                            className="w-full mt-4 bg-[#059669] hover:bg-[#047857] text-white font-bold px-1 py-2 rounded-full shadow-sm transition-colors text-[14pt] uppercase tracking-wider flex items-center justify-center gap-2 h-auto cursor-pointer"
                        >
                            Save Hole {activeHole}
                        </button>
                    )}
                </div>

                {/* Live Scores Summary */}
                {summaryPlayers.length > 0 && (
                    <div className="mt-8">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold px-1 py-2 rounded-full shadow-sm transition-colors text-[14pt] uppercase tracking-wider flex items-center justify-center gap-2 h-auto cursor-pointer mb-2"
                        >
                            Refresh: Live score summary
                        </button>
                        <div className="space-y-4">
                            {summaryPlayers
                                .map(player => {
                                    const playerScores = scores.get(player.id);
                                    let totalGross = 0;
                                    let strokesReceivedSoFar = 0;
                                    let parTotal = 0;
                                    let thru = 0;
                                    const courseHcp = getCourseHandicap(player);

                                    if (playerScores) {
                                        playerScores.forEach((strokes, holeNum) => {
                                            totalGross += strokes;
                                            const hole = defaultCourse?.holes.find(h => h.hole_number === holeNum);
                                            const holePar = hole?.par || 4;
                                            const difficulty = hole?.difficulty || holeNum;

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

                                    const totalNet = totalGross - strokesReceivedSoFar;
                                    const toPar = totalGross - parTotal;

                                    return { ...player, totalGross, strokesReceivedSoFar, courseHcp, totalNet, thru, toPar, parTotal };
                                })
                                .sort((a, b) => a.totalNet - b.totalNet)
                                .map((p, i) => {
                                    let toParStr = "E";
                                    let toParClass = "text-green-600";
                                    if (p.toPar > 0) {
                                        toParStr = `+${p.toPar}`;
                                        toParClass = "text-gray-900";
                                    } else if (p.toPar < 0) {
                                        toParStr = `${p.toPar}`;
                                        toParClass = "text-red-600";
                                    }

                                    return (
                                        <div key={p.id} className="bg-white shadow-lg rounded-xl overflow-hidden mb-4 border-4 border-gray-300">
                                            {/* Player Header */}
                                            <div className="bg-[#1d4ed8] p-3 text-white">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-white text-[#1d4ed8] font-bold rounded w-8 h-8 flex items-center justify-center text-[14pt]">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-col">
                                                                <div className="font-bold text-[14pt] leading-tight">{splitName(p.name).first}</div>
                                                                <div className="text-[12pt] leading-tight opacity-90">{splitName(p.name).last}</div>
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
                                            <div className="p-1">
                                                {/* Row 1: Holes 1-9 */}
                                                <div className="grid grid-cols-9 border-b border-gray-100">
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
                                                            flex flex-col items-center justify-center p-1 h-14 border-r border-gray-100 last:border-r-0 relative
                                                            ${bgClass}
                                                            ${isActive ? 'ring-2 ring-green-600 ring-inset z-10' : ''}
                                                        `}>
                                                                <div className="text-[12pt] text-gray-500 mb-1">{num}</div>
                                                                <div className={`text-[14pt] font-bold ${score !== null ? 'text-gray-900' : 'text-transparent'}`}>
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
                                                            flex flex-col items-center justify-center p-1 h-14 border-r border-gray-100 last:border-r-0 relative
                                                            ${bgClass}
                                                            ${isActive ? 'ring-2 ring-green-600 ring-inset z-10' : ''}
                                                        `}>
                                                                <div className="text-[12pt] text-gray-500 mb-1">{num}</div>
                                                                <div className={`text-[14pt] font-bold ${score !== null ? 'text-gray-900' : 'text-transparent'}`}>
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
                )}

                {/* Score Legend */}
                {selectedPlayers.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-3 mt-4 flex flex-wrap gap-4 items-center justify-center text-[14pt]">
                        <div className="font-bold text-gray-700 mr-2 text-[14pt]">Score Legend</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-300"></div>Eagle (-2)</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-300"></div>Birdie (-1)</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-50 border border-gray-200"></div>Par (E)</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-200"></div>Bogey (+1)</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-200"></div>Double+ (+2)</div>
                    </div>
                )}
            </main>
        </div>
    );
}
