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
    // If no round selected, fallback to first course found ?? or handle gracefully.
    // Ideally selectedRound should exist if rounds > 0.
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

                // If player has no scores, initialize all holes to par
                if (playerScores.size === 0) {
                    course.holes.forEach((hole: any) => {
                        playerScores.set(hole.hole_number, hole.par);
                    });
                    newScores.set(playerId, playerScores);
                }
            });

            // Remove scores for unselected players
            const playerIdSet = new Set(playerIds);
            Array.from(newScores.keys()).forEach(id => {
                if (!playerIdSet.has(id)) {
                    newScores.delete(id);
                }
            });

            return newScores;
        });
    };

    // Update score for active hole
    const updateScore = (playerId: string, delta: number) => {
        setLocalScores(prev => {
            const newScores = new Map(prev);
            const playerScores = new Map(newScores.get(playerId) || new Map());
            const currentScore = playerScores.get(activeHole) || 0;
            const newScore = Math.max(1, currentScore + delta); // Minimum score is 1
            playerScores.set(activeHole, newScore);
            newScores.set(playerId, playerScores);
            return newScores;
        });
        setLastUpdate(new Date());
    };

    // Get score for a player on a specific hole
    const getScore = (playerId: string, holeNumber: number): number | null => {
        const score = localScores.get(playerId)?.get(holeNumber);
        return score !== undefined ? score : null;
    };

    // Get hole par
    const getHolePar = (holeNumber: number) => {
        const hole = course.holes.find((h: any) => h.hole_number === holeNumber);
        return hole?.par || 4;
    };

    // Calculate total score for a player
    const getTotalScore = (playerId: string) => {
        const playerScores = localScores.get(playerId);
        if (!playerScores || playerScores.size === 0) return 0;
        let total = 0;
        playerScores.forEach(score => total += score);
        return total;
    };

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
            // TODO: Implement save functionality
            console.log('Saving round:', { selectedRoundId, selectedPlayerIds, localScores });

            // Mark the current hole as saved (completed)
            setSavedHoles(prev => new Set(prev).add(activeHole));

            // Move to next hole if not on hole 18
            if (activeHole < 18) {
                setActiveHole(activeHole + 1);
            }

            alert('✅ Scores saved successfully! (Save functionality to be implemented)');
        } catch (error) {
            console.error('Failed to save scores:', error);
            alert('❌ Failed to save scores');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-1">
            <div className="w-full">
                {/* Header */}
                <div className="mb-1">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                🔴 Live Scoring
                            </h1>
                            <p className="text-sm text-gray-600">
                                {course.name}
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            Back
                        </Link>
                    </div>

                    {/* Round Selection */}
                    <div className="bg-white rounded-lg shadow-sm p-1 mb-1">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Select Round</label>
                        <select
                            value={selectedRoundId}
                            onChange={(e) => setSelectedRoundId(e.target.value)}
                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            {rounds.map((round) => (
                                <option key={round.id} value={round.id}>
                                    {new Date(round.date).toLocaleDateString()} - {round.course.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-1 text-xs text-gray-600">
                        <div>
                            Updated: {lastUpdate.toLocaleTimeString()}
                        </div>
                        <div>
                            {selectedPlayers.length} players
                        </div>
                    </div>
                </div>

                {/* My Group - Interactive */}
                <div className="mb-1 bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-1 py-2 flex justify-between items-center rounded-t-xl">
                        <h2 className="text-lg font-bold">My Group</h2>
                        <button
                            onClick={() => setIsPlayerModalOpen(true)}
                            className="px-3 py-1 bg-white text-blue-600 rounded-full font-bold hover:bg-blue-50 transition text-sm"
                        >
                            Players ({selectedPlayers.length})
                        </button>
                    </div>

                    {selectedPlayers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            <p className="text-base mb-1">No players selected</p>
                            <p className="text-xs">Click "Players (0)" to select players</p>
                        </div>
                    ) : (
                        <>
                            {/* Active Hole Selector */}
                            <div className="bg-gray-50 p-1 border-b border-gray-200">
                                <label className="block text-xs font-bold text-gray-700 mb-1">Active Hole:</label>
                                <div className="grid grid-cols-6 gap-1">
                                    {course.holes.map((hole: any) => {
                                        const isActive = activeHole === hole.hole_number;
                                        // Hole is completed (black) only if it has been saved
                                        const isCompleted = savedHoles.has(hole.hole_number);

                                        let buttonClass = '';
                                        if (isActive) {
                                            // Active hole - green
                                            buttonClass = 'bg-green-600 text-white ring-2 ring-green-300';
                                        } else if (isCompleted) {
                                            // Completed hole - black
                                            buttonClass = 'bg-black text-white';
                                        } else {
                                            // Future hole - white
                                            buttonClass = 'bg-white text-gray-700 border-2 border-gray-300';
                                        }

                                        return (
                                            <button
                                                key={hole.id}
                                                onClick={() => setActiveHole(hole.hole_number)}
                                                className={`w-full h-10 rounded-lg font-bold transition text-sm ${buttonClass} hover:opacity-80`}
                                            >
                                                {hole.hole_number}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    Hole {activeHole} • Par {getHolePar(activeHole)}
                                </p>
                            </div>

                            {/* Player Scoring */}
                            <div className="p-1">
                                <div className="space-y-1">
                                    {selectedPlayers.map((player) => {
                                        const score = getScore(player.id, activeHole);
                                        const par = getHolePar(activeHole);
                                        const total = getTotalScore(player.id);
                                        const totalPar = course.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                                        const scoreToPar = total - totalPar;

                                        return (
                                            <div
                                                key={player.id}
                                                className="border-2 border-blue-500 bg-blue-50 rounded-lg p-1"
                                            >
                                                <div className="flex items-center justify-between">
                                                    {/* Player Info */}
                                                    <div>
                                                        <div className="font-bold text-base">{player.name}</div>
                                                        <div className="text-xs text-gray-600">
                                                            Total: {total} ({scoreToPar > 0 ? '+' : ''}{scoreToPar})
                                                        </div>
                                                    </div>

                                                    {/* Active Hole Score Controls */}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => updateScore(player.id, -1)}
                                                            className="w-10 h-10 bg-red-500 text-white rounded-lg font-bold text-xl hover:bg-red-600 transition active:scale-95"
                                                        >
                                                            −
                                                        </button>
                                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold ${getScoreColor(score, par)}`}>
                                                            {score || '-'}
                                                        </div>
                                                        <button
                                                            onClick={() => updateScore(player.id, 1)}
                                                            className="w-10 h-10 bg-green-500 text-white rounded-lg font-bold text-xl hover:bg-green-600 transition active:scale-95"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={saveScores}
                                    className="mt-1 w-full py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-bold text-base hover:from-green-700 hover:to-blue-700 transition active:scale-95"
                                >
                                    💾 Save Scores
                                </button>
                            </div>

                            {/* Live Scores Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-1 py-2 rounded-t-xl">
                                <h3 className="text-lg font-bold">Live Scores</h3>
                            </div>

                            {/* Full Scorecard */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                                            <th className="px-1 py-1 text-left font-bold sticky left-0 bg-gray-100 z-10">Player</th>
                                            <th className="px-1 py-1 text-center font-bold">Total</th>
                                            {course.holes.map((hole: any) => (
                                                <th key={hole.id} className={`px-2 py-2 text-center font-bold min-w-[40px] ${activeHole === hole.hole_number ? 'bg-green-200' : ''}`}>
                                                    {hole.hole_number}
                                                </th>
                                            ))}
                                        </tr>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-1 py-1 text-left text-xs text-gray-600 sticky left-0 bg-gray-50 z-10">Par</th>
                                            <th className="px-1 py-1 text-center text-xs text-gray-600">
                                                {course.holes.reduce((sum: number, h: any) => sum + h.par, 0)}
                                            </th>
                                            {course.holes.map((hole: any) => (
                                                <th key={hole.id} className={`px-1 py-1 text-center text-xs text-gray-600 ${activeHole === hole.hole_number ? 'bg-green-200' : ''}`}>
                                                    {hole.par}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...selectedPlayers].sort((a, b) => {
                                            const aLastName = a.name.split(' ').pop() || a.name;
                                            const bLastName = b.name.split(' ').pop() || b.name;
                                            return aLastName.localeCompare(bLastName);
                                        }).map((player) => {
                                            const total = getTotalScore(player.id);
                                            const totalPar = course.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                                            const scoreToPar = total - totalPar;

                                            return (
                                                <tr key={player.id} className="border-b border-gray-200 hover:bg-blue-50 transition">
                                                    <td className="px-1 py-1 font-semibold sticky left-0 bg-white z-10 text-xs">
                                                        {player.name}
                                                    </td>
                                                    <td className="px-1 py-1 text-center font-bold text-sm">
                                                        <span className={scoreToPar === 0 ? 'text-blue-600' : scoreToPar < 0 ? 'text-green-600' : 'text-red-600'}>
                                                            {total}
                                                            <span className="text-xs ml-1">
                                                                ({scoreToPar > 0 ? '+' : ''}{scoreToPar})
                                                            </span>
                                                        </span>
                                                    </td>
                                                    {course.holes.map((hole: any) => {
                                                        const strokes = getScore(player.id, hole.hole_number);
                                                        const par = hole.par;
                                                        return (
                                                            <td key={hole.id} className={`px-1 py-1 text-center ${activeHole === hole.hole_number ? 'bg-green-100' : ''}`}>
                                                                <div className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs ${getScoreColor(strokes, par)}`}>
                                                                    {strokes || '-'}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Legend */}
                <div className="mt-1 bg-white rounded-xl shadow-lg p-1">
                    <h3 className="text-sm font-bold text-gray-900 mb-1">Score Legend</h3>
                    <div className="flex flex-wrap gap-1 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded bg-yellow-400 border border-yellow-600"></div>
                            <span>Eagle (-2)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded bg-green-500 border border-green-700"></div>
                            <span>Birdie (-1)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded bg-blue-100 border border-blue-300"></div>
                            <span>Par (E)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded bg-orange-100 border border-orange-300"></div>
                            <span>Bogey (+1)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded bg-red-100 border border-red-300"></div>
                            <span>Double+ (+2)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Player Selection Modal */}
            <LivePlayerSelectionModal
                allPlayers={allPlayers}
                selectedIds={selectedPlayerIds}
                onSelectionChange={handlePlayerSelectionFromModal}
                isOpen={isPlayerModalOpen}
                onClose={() => setIsPlayerModalOpen(false)}
            />
        </div>
    );
}
