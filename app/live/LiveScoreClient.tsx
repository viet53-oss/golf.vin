'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LivePlayerSelectionModal } from '@/components/LivePlayerSelectionModal';

interface LiveScoreClientProps {
    rounds: any[];
    allPlayers: Array<{ id: string; name: string }>;
    isAdmin: boolean;
}

export default function LiveScoreClient({ rounds, allPlayers, isAdmin }: LiveScoreClientProps) {
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Round selection state
    const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[0]?.id || '');
    const selectedRound = rounds.find(r => r.id === selectedRoundId);

    // Safely get course from selected round, handle potential missing data
    const course = selectedRound?.course;

    // State for interactive scoring
    const [activeHole, setActiveHole] = useState<number>(1);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [localScores, setLocalScores] = useState<Map<string, Map<number, number>>>(new Map());
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [savedHoles, setSavedHoles] = useState<Set<number>>(new Set()); // Track which holes have been saved

    // Get selected players with their data
    const selectedPlayers = allPlayers.filter(p => selectedPlayerIds.includes(p.id));

    // Handle player selection from modal
    const handlePlayerSelectionFromModal = (playerIds: string[]) => {
        setSelectedPlayerIds(playerIds);

        // Initialize scores for newly selected players
        setLocalScores(prev => {
            const newScores = new Map(prev);

            playerIds.forEach((playerId) => {
                const playerScores = newScores.get(playerId) || new Map<number, number>();

                // Initialize empty scores map for new players if not exists
                if (!newScores.has(playerId)) {
                    newScores.set(playerId, playerScores);
                }
            });

            return newScores;
        });

        setIsPlayerModalOpen(false);
    };

    // Helper to get score for a specific player and hole
    const getScore = (playerId: string, holeNumber: number): number | null => {
        const playerScores = localScores.get(playerId);
        // Return null if no score set
        return playerScores?.get(holeNumber) || null;
    };

    // Helper to get total score
    const getTotalScore = (playerId: string): number => {
        const playerScores = localScores.get(playerId);
        if (!playerScores) return 0;

        let total = 0;
        playerScores.forEach((score) => {
            total += score;
        });
        return total;
    };

    // Update score locally
    const updateScore = (playerId: string, change: number) => {
        setLocalScores(prev => {
            const newScores = new Map(prev);
            const playerScores = newScores.get(playerId) || new Map<number, number>();

            // Get current score or default to par for this hole
            const currentHolePar = course.holes.find((h: any) => h.hole_number === activeHole)?.par || 4;
            const currentVal = playerScores.get(activeHole);

            let newVal;
            if (currentVal === undefined || currentVal === null) {
                newVal = currentHolePar + change; // Start at Par + change
            } else {
                newVal = currentVal + change;
            }

            // Prevent unrealistic scores
            if (newVal < 1) newVal = 1;
            if (newVal > 15) newVal = 15;

            playerScores.set(activeHole, newVal);
            newScores.set(playerId, playerScores);
            return newScores;
        });
    };

    // Initialize ALL hole scores to par if not set
    useEffect(() => {
        if (selectedPlayers.length > 0 && course) {
            setLocalScores(prev => {
                const newScores = new Map(prev);
                let overallChanged = false;

                selectedPlayers.forEach(player => {
                    const existingScores = prev.get(player.id);
                    // Create a new Map to ensure React detects changes
                    const playerScores = existingScores ? new Map(existingScores) : new Map<number, number>();
                    let playerChanged = false;

                    // Initialize all 18 holes to par
                    course.holes.forEach((hole: any) => {
                        if (!playerScores.has(hole.hole_number)) {
                            playerScores.set(hole.hole_number, hole.par);
                            playerChanged = true;
                        }
                    });

                    if (playerChanged) {
                        newScores.set(player.id, playerScores);
                        overallChanged = true;
                    }
                });

                return overallChanged ? newScores : prev;
            });
        }
    }, [selectedPlayers, course]);

    // Get score color based on relation to par
    const getScoreColor = (strokes: number | null, par: number) => {
        if (strokes === null) return 'bg-gray-100 text-gray-400';
        const diff = strokes - par;
        if (diff <= -2) return 'bg-yellow-400 text-black font-bold'; // Eagle or better
        if (diff === -1) return 'bg-green-500 text-white font-bold'; // Birdie
        if (diff === 0) return 'bg-blue-100 text-blue-900'; // Par
        if (diff === 1) return 'bg-orange-100 text-orange-900'; // Bogey
        return 'bg-red-100 text-red-900'; // Double bogey or worse
    };

    // Save scores to database
    const saveScores = async () => {
        try {
            // TODO: Implement save functionality
            console.log('Saving round:', { selectedRoundId, selectedPlayerIds, localScores });

            // Mark the current hole as saved (completed)
            setSavedHoles(prev => new Set(prev).add(activeHole));

            // Move to next hole if not on hole 18
            if (activeHole < 18) {
                setActiveHole(activeHole + 1);
            }
        } catch (error) {
            console.error('Failed to save scores:', error);
            alert('❌ Failed to save scores');
        }
    };

    // Helper to verify if hole is completed (saved)
    const isHoleCompleted = (holeNumber: number) => {
        return savedHoles.has(holeNumber);
    };

    if (!course) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Course</h2>
                    <p className="text-gray-600">Could not load course data for the selected round.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-20 font-sans">
            {/* Header */}
            <header className="bg-black text-white px-2 py-3 shadow-md sticky top-0 z-50">
                <div className="flex justify-between items-center w-full px-2">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse"></div>
                        <h1 className="text-[14pt] font-bold tracking-tight">Live Scoring</h1>
                    </div>
                </div>
            </header>

            <main className="w-full p-1">
                {/* Header Card */}
                <div className="bg-white rounded-xl shadow-sm p-2 mb-1 border-l-4 border-blue-600">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-[14pt] font-bold text-gray-900 leading-tight">City Park Golf Club</h2>
                            <p className="text-gray-600 text-[12pt] font-medium mt-0.5">
                                {course.name}
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="px-3 py-1 bg-black text-white rounded-full text-[12pt] font-bold hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            Back
                        </Link>
                    </div>

                    {/* Round Selection */}
                    <div className="mt-2 bg-gray-50 rounded-lg p-1.5 border border-gray-100">
                        <label className="block text-[12pt] font-bold text-gray-500 uppercase tracking-wider mb-1">Select Round</label>
                        <select
                            value={selectedRoundId}
                            onChange={(e) => setSelectedRoundId(e.target.value)}
                            className="w-full px-2 py-1.5 text-[12pt] border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            {rounds.map((round) => (
                                <option key={round.id} value={round.id}>
                                    {new Date(round.date).toLocaleDateString()} - {round.course.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-[12pt] text-gray-500 font-medium">
                        <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span>{selectedPlayers.length} players</span>
                    </div>
                </div>

                {/* My Group - Interactive */}
                <div className="mb-1 bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-2 flex justify-between items-center rounded-t-xl">
                        <h2 className="text-[14pt] font-bold">My Group</h2>
                        <button
                            onClick={() => setIsPlayerModalOpen(true)}
                            className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[12pt] font-semibold backdrop-blur-sm transition text-white flex items-center gap-1 border border-white/30"
                        >
                            <span className="bg-white text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[12pt] font-bold">
                                {selectedPlayers.length}
                            </span>
                            Players
                        </button>
                    </div>

                    {selectedPlayers.length === 0 ? (
                        <div className="p-4 text-center">
                            <p className="text-gray-500 text-[12pt] mb-3">No players selected.</p>
                            <button
                                onClick={() => setIsPlayerModalOpen(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[12pt] font-bold shadow-md hover:bg-blue-700 transition"
                            >
                                + Add Players to Group
                            </button>
                        </div>
                    ) : (
                        <div className="p-1">
                            {/* Hole Selector - 6 per line for mobile */}
                            <div className="mb-2">
                                <div className="flex justify-between items-end mb-1 px-1">
                                    <h3 className="text-[12pt] font-bold text-gray-700">Active Hole:</h3>
                                </div>
                                <div className="grid grid-cols-6 gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100">
                                    {course.holes.map((hole: any) => (
                                        <div key={hole.id} className="relative">
                                            {isHoleCompleted(hole.hole_number) && !activeHole === hole.hole_number && (
                                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white z-20"></div>
                                            )}
                                            <button
                                                onClick={() => setActiveHole(hole.hole_number)}
                                                className={`w-full py-1.5 rounded-md text-[12pt] font-bold transition-all shadow-sm border ${activeHole === hole.hole_number
                                                    ? 'bg-green-600 text-white border-green-700 scale-105 z-10 ring-1 ring-green-300'
                                                    : isHoleCompleted(hole.hole_number)
                                                        ? 'bg-black text-white border-black hover:bg-gray-800'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {hole.hole_number}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-center mt-1">
                                    <span className="text-[12pt] font-semibold text-gray-500">
                                        Hole {activeHole} • Par {course.holes.find((h: any) => h.hole_number === activeHole)?.par}
                                    </span>
                                </div>
                            </div>

                            {/* Scoring Cards */}
                            <div className="space-y-1">
                                {selectedPlayers.map((player) => {
                                    const score = getScore(player.id, activeHole);
                                    const par = course.holes.find((h: any) => h.hole_number === activeHole)?.par || 4;
                                    const total = getTotalScore(player.id);

                                    return (
                                        <div key={player.id} className="bg-blue-50/50 rounded-lg p-1.5 border border-blue-100 flex items-center justify-between">
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-bold text-[12pt] text-gray-900 truncate pr-2">{player.name}</span>
                                                <span className="text-[12pt] text-gray-500 font-medium">
                                                    Total: {total}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => updateScore(player.id, -1)}
                                                    className="w-10 h-10 bg-red-500 text-white rounded-lg font-bold text-xl hover:bg-red-600 transition active:scale-95 flex items-center justify-center shadow-sm"
                                                >
                                                    −
                                                </button>
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-[14pt] font-bold border-2 ${score !== null
                                                    ? 'bg-white border-gray-200 text-gray-900 shadow-inner'
                                                    : 'bg-gray-100 border-dashed border-gray-300 text-gray-400'
                                                    } ${score !== null ? getScoreColor(score, par).replace('bg-', 'text-').replace('text-', 'border-') : ''}`}>
                                                    {score || '-'}
                                                </div>
                                                <button
                                                    onClick={() => updateScore(player.id, 1)}
                                                    className="w-10 h-10 bg-green-500 text-white rounded-lg font-bold text-xl hover:bg-green-600 transition active:scale-95 flex items-center justify-center shadow-sm"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={saveScores}
                                className="mt-2 w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-bold text-[14pt] hover:from-green-700 hover:to-blue-700 transition active:scale-98 shadow-md flex items-center justify-center gap-2"
                            >
                                <span>💾</span> Save Scores
                            </button>
                        </div>
                    )}

                    {/* Live Scores Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-2 rounded-t-xl mt-3">
                        <h3 className="text-[14pt] font-bold">Live Scores</h3>
                    </div>

                    {/* Full Scorecard - Card Layout per Player */}
                    <div className="bg-white border-t border-gray-200">
                        <div className="bg-gray-50 px-2 py-1 border-b border-gray-200 text-[12pt] font-bold text-gray-500 uppercase tracking-wider text-center">
                            Live Score Summary
                        </div>
                        <div className="p-2 space-y-4">
                            {[...selectedPlayers].sort((a, b) => {
                                const aLastName = a.name.split(' ').pop() || a.name;
                                const bLastName = b.name.split(' ').pop() || b.name;
                                return aLastName.localeCompare(bLastName);
                            }).map((player) => {
                                // Calculate live totals based ONLY on saved holes
                                const playerScores = localScores.get(player.id);
                                let liveGross = 0;
                                let liveToPar = 0;
                                let anySaved = false;

                                course.holes.forEach((hole: any) => {
                                    if (isHoleCompleted(hole.hole_number)) {
                                        const score = playerScores?.get(hole.hole_number);
                                        if (score !== undefined) {
                                            liveGross += score;
                                            liveToPar += (score - hole.par);
                                            anySaved = true;
                                        }
                                    }
                                });

                                const toParDisplay = !anySaved ? 'e' : liveToPar === 0 ? 'e' : liveToPar > 0 ? `+${liveToPar}` : liveToPar;

                                return (
                                    <div key={player.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                        {/* Player Header - Centered on one line */}
                                        <div className="bg-blue-600 text-white px-3 py-1.5 flex justify-center items-center gap-4 text-[14pt] font-bold">
                                            <span>{player.name}</span>
                                            <span className="opacity-80">Grs: {liveGross}</span>
                                            <span className="bg-white/20 px-2 rounded">{toParDisplay}</span>
                                        </div>

                                        {/* Hole Grid - 9 holes per line (2 rows) */}
                                        <div className="p-1.5 grid grid-cols-9 gap-1 bg-white">
                                            {course.holes.map((hole: any) => {
                                                const isSaved = isHoleCompleted(hole.hole_number);
                                                const strokes = isSaved ? getScore(player.id, hole.hole_number) : null;
                                                const par = hole.par;
                                                const isActive = activeHole === hole.hole_number;

                                                return (
                                                    <div key={hole.id} className={`flex flex-col items-center border rounded py-1 ${isActive ? 'bg-green-100 border-green-300 ring-1 ring-green-200' : 'border-gray-50 bg-gray-50/20'}`}>
                                                        <span className={`text-[12pt] font-bold ${isActive ? 'text-green-800' : 'text-gray-400'}`}>{hole.hole_number}</span>
                                                        <div className={`w-9 h-9 flex items-center justify-center rounded text-[12pt] font-bold mt-0.5 ${isSaved ? getScoreColor(strokes, par) : 'bg-transparent text-transparent'}`}>
                                                            {isSaved ? strokes : ''}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-1 bg-white rounded-xl shadow-lg p-2">
                    <h3 className="text-[14pt] font-bold text-gray-900 mb-1">Score Legend</h3>
                    <div className="flex flex-wrap gap-2 text-[12pt]">
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-yellow-400 rounded-sm"></span>
                            <span>Eagle (-2)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-green-500 rounded-sm"></span>
                            <span>Birdie (-1)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-blue-100 rounded-sm border border-blue-200"></span>
                            <span>Par (E)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-orange-100 rounded-sm border border-orange-200"></span>
                            <span>Bogey (+1)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-red-100 rounded-sm border border-red-200"></span>
                            <span>Double+ (+2)</span>
                        </div>
                    </div>
                </div>

                {/* Connection Status */}
                <div className="mt-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[12pt] font-medium bg-green-100 text-green-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                        Connected to Live Server
                    </span>
                </div>
            </main>

            <LivePlayerSelectionModal
                isOpen={isPlayerModalOpen}
                onClose={() => setIsPlayerModalOpen(false)}
                allPlayers={allPlayers}
                selectedIds={selectedPlayerIds}
                onSelectionChange={handlePlayerSelectionFromModal}
            />
        </div>
    );
}
