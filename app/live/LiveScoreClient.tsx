'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LivePlayerSelectionModal } from '@/components/LivePlayerSelectionModal';
import { saveLiveHoleScores } from '@/app/actions/update-live-score';
import { completeRound, reopenRound } from '@/app/actions/complete-round';
import { createRound, createLiveRound } from '@/app/actions';
import { useRouter } from 'next/navigation';

interface LiveScoreClientProps {
    rounds: any[];
    allPlayers: Array<{ id: string; name: string; index: number; preferred_tee_box: string | null }>;
    courses: any[];
    isAdmin: boolean;
}

export default function LiveScoreClient({ rounds, allPlayers, courses, isAdmin }: LiveScoreClientProps) {
    const router = useRouter();
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [mounted, setMounted] = useState(false);

    // Get today's date in local ISO format (YYYY-MM-DD)
    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    // Find if any round exists for today
    const todaysRound = rounds.find(r => r.date.startsWith(todayStr));

    useEffect(() => {
        setMounted(true);
    }, []);

    // Round selection state - Default to today's round if it exists, else empty to show the 'No Round Selected' popup
    const [selectedRoundId, setSelectedRoundId] = useState<string>(
        todaysRound?.id || ''
    );

    // Update selectedRoundId if todaysRound is found later (e.g. after creation or data update)
    useEffect(() => {
        if (todaysRound && (!selectedRoundId || selectedRoundId !== todaysRound.id)) {
            setSelectedRoundId(todaysRound.id);
        }
    }, [todaysRound?.id, rounds.length]);

    const selectedRound = rounds.find(r => r.id === selectedRoundId);

    // Safely get course from selected round, handle potential missing data
    const course = selectedRound?.course;

    // State for interactive scoring
    const [activeHole, setActiveHole] = useState<number>(1);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [localScores, setLocalScores] = useState<Map<string, Map<number, number>>>(new Map());
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [savedHoles, setSavedHoles] = useState<Set<number>>(new Set()); // Track which holes have been saved
    const [renderTrigger, setRenderTrigger] = useState(0); // Force re-renders

    // New Round Form State
    const [isCreatingRound, setIsCreatingRound] = useState(false);
    const [newRoundName, setNewRoundName] = useState('');
    const [newRoundDate, setNewRoundDate] = useState(todayStr);
    const [newCourseName, setNewCourseName] = useState('City Park North');
    const [newPar, setNewPar] = useState(68);
    const [newRating, setNewRating] = useState(63.8);
    const [newSlope, setNewSlope] = useState(100);
    const [isSavingNewRound, setIsSavingNewRound] = useState(false);

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
        // Return null if no score set, but return 0 if score is actually 0
        const score = playerScores?.get(holeNumber);
        return score !== undefined ? score : null;
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
        console.log('updateScore START:', { playerId, change, activeHole });
        setLocalScores(prev => {
            const newScores = new Map(prev);
            const existingScores = newScores.get(playerId);
            const playerScores = existingScores ? new Map(existingScores) : new Map<number, number>();

            // Get current score or default to par for this hole
            const currentHolePar = course.holes.find((h: any) => h.hole_number === activeHole)?.par || 4;
            const currentVal = playerScores.get(activeHole);

            let newVal;
            if (currentVal === undefined || currentVal === null) {
                // If no score set yet, start at par + change
                // So clicking + starts at par, clicking - starts at par-1
                newVal = currentHolePar + change;
            } else {
                newVal = currentVal + change;
            }

            // Prevent unrealistic scores
            if (newVal < 1) newVal = 1;
            if (newVal > 15) newVal = 15;

            console.log(`Setting score for hole ${activeHole}: ${currentVal} -> ${newVal}`);
            playerScores.set(activeHole, newVal);
            newScores.set(playerId, playerScores);

            // Verify it was set
            console.log('Verification:', newScores.get(playerId)?.get(activeHole));
            return newScores;
        });
        // Force re-render
        setRenderTrigger(prev => prev + 1);
        console.log('updateScore END');
    };

    // Consolidate initialization and state restoration from selected round
    useEffect(() => {
        if (!course) return;

        // 1. Get existing players from the round
        const roundPlayersData = selectedRound?.players || [];
        const existingPlayerIds = roundPlayersData.map((p: any) => p.player_id);

        // 2. Build localScores map and savedHoles set from DB data
        const newScoresMap = new Map<string, Map<number, number>>();
        const newlySavedHoles = new Set<number>();

        // Map hole IDs to numbers for this course for quick lookup
        const holeIdToNum = new Map(course.holes.map((h: any) => [h.id, h.hole_number]));

        // First, handle players already in the round from DB
        roundPlayersData.forEach((rp: any) => {
            const playerHoleScores = new Map<number, number>();

            rp.scores.forEach((s: any) => {
                const holeNum = holeIdToNum.get(s.hole_id);
                if (holeNum !== undefined) {
                    playerHoleScores.set(holeNum as number, s.strokes as number);
                    newlySavedHoles.add(holeNum as number);
                }
            });

            // DON'T fill in pars for gaps - let them be undefined/null
            // This allows user input to work properly

            newScoresMap.set(rp.player_id, playerHoleScores);
        });

        // Also ensure any players selected via modal but not yet in DB have empty maps
        selectedPlayerIds.forEach(pid => {
            if (!newScoresMap.has(pid)) {
                const playerHoleScores = new Map<number, number>();
                // DON'T pre-fill with par - let scores be undefined until user sets them
                newScoresMap.set(pid, playerHoleScores);
            }
        });

        // 3. Update all states
        setLocalScores(newScoresMap);
        setSavedHoles(newlySavedHoles);

        // Only auto-initialize player IDs if currently empty (first load)
        if (selectedPlayerIds.length === 0 && existingPlayerIds.length > 0) {
            setSelectedPlayerIds(existingPlayerIds);
        }

        // Set active hole to first uncompleted one
        if (newlySavedHoles.size < 18) {
            for (let i = 1; i <= 18; i++) {
                if (!newlySavedHoles.has(i)) {
                    setActiveHole(i);
                    break;
                }
            }
        } else {
            setActiveHole(18); // Stay on 18 if all done
        }
    }, [selectedRoundId, course, selectedRound]);

    // Get score color based on relation to par
    const getScoreColor = (strokes: number | null, par: number) => {
        if (strokes === null) return 'bg-gray-100 text-gray-400';
        const diff = strokes - par;
        if (diff <= -2) return 'bg-yellow-400 text-black font-bold'; // Eagle or better
        if (diff === -1) return 'bg-green-500 text-white font-bold'; // Birdie
        if (diff === 0) return 'bg-blue-100 text-blue-900'; // Par
        if (diff === 1) return 'bg-orange-100 text-orange-900'; // Bogey
        return 'bg-red-200 text-red-900 font-bold'; // Double bogey or worse
    };

    // Save scores to database
    const saveScores = async () => {
        if (!selectedRoundId) {
            alert('❌ Please select a round first');
            return;
        }

        if (selectedPlayerIds.length === 0) {
            alert('❌ Please select players first');
            return;
        }

        try {
            // Prepare scores for the current hole
            const scoresToSave = selectedPlayerIds.map(pid => {
                const score = getScore(pid, activeHole);
                const currentHolePar = course.holes.find((h: any) => h.hole_number === activeHole)?.par || 4;
                return {
                    playerId: pid,
                    strokes: score || currentHolePar // Default to par if no score set
                };
            });

            const result = await saveLiveHoleScores(selectedRoundId, activeHole, scoresToSave);

            if (!result.success) {
                throw new Error(result.error);
            }

            // Mark the current hole as saved (completed)
            setSavedHoles(prev => new Set(prev).add(activeHole));
            setLastUpdate(new Date());

            // Move to next hole if not on hole 18
            if (activeHole < 18) {
                setActiveHole(activeHole + 1);
            }
        } catch (error) {
            console.error('Failed to save scores:', error);
            alert(`❌ Failed to save scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Helper to get live relative-to-par score for sorting/display
    const getLiveToParData = (playerId: string) => {
        const playerScores = localScores.get(playerId);
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

        return { liveGross, liveToPar, anySaved };
    };

    // Helper to verify if hole is completed (saved)
    const isHoleCompleted = (holeNumber: number) => {
        return savedHoles.has(holeNumber);
    };

    // Create a new round for today
    const handleCreateNewRound = async () => {
        if (!newRoundName.trim() || !newCourseName.trim()) {
            alert('Please enter a round name and course name');
            return;
        }

        setIsSavingNewRound(true);
        try {
            const newRound = await createLiveRound({
                date: newRoundDate,
                name: newRoundName,
                courseName: newCourseName,
                par: newPar,
                rating: newRating,
                slope: newSlope
            });

            if (newRound) {
                setIsCreatingRound(false);
                setNewRoundName('');
                setNewCourseName('');
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to create round:', error);
            alert('❌ Failed to create round');
        } finally {
            setIsSavingNewRound(false);
        }
    };

    const handleCompleteRound = async () => {
        if (!selectedRoundId) return;
        if (!confirm('This will finalize the round and update all player handicaps. Proceed?')) return;

        try {
            const result = await completeRound(selectedRoundId);
            if (result.success) {
                alert('✅ Round completed! Handicaps have been updated.');
                router.refresh();
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Failed to complete round:', error);
            alert('❌ Failed to complete round');
        }
    };

    const handleReopenRound = async () => {
        if (!selectedRoundId) return;
        if (!confirm('This will reopen the round and remove it from handicap calculations until completed again. Proceed?')) return;

        try {
            const result = await reopenRound(selectedRoundId);
            if (result.success) {
                alert('🔓 Round reopened. Handicaps have been recalculated.');
                router.refresh();
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Failed to reopen round:', error);
            alert('❌ Failed to reopen round');
        }
    };

    if (!course) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <header className="bg-black text-white px-2 py-3 shadow-md">
                    <h1 className="text-[14pt] font-bold">Live Scoring</h1>
                </header>
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-[#f2f2f2] p-8 rounded-[20px] shadow-xl text-center max-w-sm w-full border-t-[6px] border-[#2563eb] relative overflow-hidden">
                        {!isCreatingRound ? (
                            <div className="flex flex-col items-center">
                                {/* Golf Flag Icon */}
                                <div className="mb-6">
                                    <div className="w-20 h-20 bg-transparent flex items-center justify-center relative">
                                        <svg viewBox="0 0 100 100" className="w-16 h-16">
                                            <circle cx="50" cy="70" r="15" fill="#000" fillOpacity="0.1" />
                                            <path d="M50 20 L50 75" stroke="#000" strokeWidth="4" strokeLinecap="round" />
                                            <path d="M50 20 L80 35 L50 50 Z" fill="#ef4444" />
                                            <ellipse cx="50" cy="75" rx="25" ry="10" fill="#22c55e" stroke="#000" strokeWidth="2" />
                                            <circle cx="65" cy="75" r="3" fill="#fff" />
                                        </svg>
                                    </div>
                                </div>

                                <h2 className="text-[20pt] font-extrabold text-gray-900 mb-1 leading-tight">No Round Selected</h2>
                                <p className="text-gray-500 text-[13pt] font-medium mb-8">
                                    There are no live rounds for today yet.
                                </p>

                                <div className="space-y-4 w-full">
                                    <button
                                        onClick={() => setIsCreatingRound(true)}
                                        className="w-full py-4 bg-[#01a642] text-white rounded-[15px] font-bold text-[16pt] hover:bg-[#018a37] transition shadow-md active:scale-95 flex items-center justify-center gap-2 border border-[#00000022]"
                                    >
                                        <span className="text-[20pt] leading-none mb-1">＋</span> New Round for Today
                                    </button>

                                    <button
                                        onClick={() => window.location.href = '/'}
                                        className="text-[#5b7a95] font-bold text-[14pt] hover:underline pt-2 block w-full"
                                    >
                                        Go Back
                                    </button>
                                </div>

                                {rounds.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-gray-200 w-full">
                                        <p className="text-[10pt] font-bold text-gray-400 uppercase mb-3 tracking-wider">Or Select Recent</p>
                                        <select
                                            value={selectedRoundId}
                                            onChange={(e) => setSelectedRoundId(e.target.value)}
                                            className="w-full px-3 py-3 text-[12pt] border border-gray-300 rounded-xl bg-white text-gray-700 font-medium"
                                        >
                                            <option value="">Choose a round...</option>
                                            {rounds.map((round) => (
                                                <option key={round.id} value={round.id}>
                                                    {round.date} - {round.name || 'Round'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-[14pt] font-bold text-gray-900">Live Round for: {newRoundDate}</h3>
                                <div className="text-left space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10pt] font-bold text-gray-500 uppercase mb-1">Date</label>
                                            <input
                                                type="date"
                                                value={newRoundDate}
                                                onChange={(e) => setNewRoundDate(e.target.value)}
                                                className="w-full px-3 py-2 text-[12pt] border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10pt] font-bold text-gray-500 uppercase mb-1">Round Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Sunday Shootout"
                                                value={newRoundName}
                                                onChange={(e) => setNewRoundName(e.target.value)}
                                                className="w-full px-3 py-2 text-[12pt] border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10pt] font-bold text-gray-500 uppercase mb-1">Name of Course</label>
                                        <input
                                            type="text"
                                            placeholder="Enter course name"
                                            value={newCourseName}
                                            onChange={(e) => setNewCourseName(e.target.value)}
                                            className="w-full px-3 py-2 text-[12pt] border border-gray-300 rounded-md bg-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10pt] font-bold text-gray-500 uppercase mb-1">Par</label>
                                            <input
                                                type="number"
                                                value={newPar}
                                                onChange={(e) => setNewPar(parseInt(e.target.value) || 72)}
                                                className="w-full px-3 py-2 text-[12pt] border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10pt] font-bold text-gray-500 uppercase mb-1">Rating</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={newRating}
                                                onChange={(e) => setNewRating(parseFloat(e.target.value) || 72.0)}
                                                className="w-full px-3 py-2 text-[12pt] border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10pt] font-bold text-gray-500 uppercase mb-1">Slope</label>
                                            <input
                                                type="number"
                                                value={newSlope}
                                                onChange={(e) => setNewSlope(parseInt(e.target.value) || 113)}
                                                className="w-full px-3 py-2 text-[12pt] border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 pt-2">
                                    <button
                                        onClick={handleCreateNewRound}
                                        disabled={isSavingNewRound}
                                        className="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-[14pt] hover:bg-green-700 transition shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        {isSavingNewRound ? 'Creating...' : '🚀 Start Scoring'}
                                    </button>
                                    <button
                                        onClick={() => setIsCreatingRound(false)}
                                        className="w-full py-2 text-gray-500 font-bold hover:text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                        <Link
                            href="/"
                            className="block mt-6 text-gray-500 font-medium hover:text-gray-700"
                        >
                            Go Back Home
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-20 font-sans">
            {/* Header */}
            <header className="bg-black text-white px-2 py-3 shadow-md sticky top-0 z-50">
                <div className="flex justify-between items-center w-full px-2">
                    <h1 className="text-[14pt] font-bold tracking-tight">Live scoring</h1>
                    <Link
                        href="/"
                        className="px-3 py-1 bg-white text-black rounded-full text-[12pt] font-bold hover:bg-gray-200 transition-colors shadow-sm"
                    >
                        Back
                    </Link>
                </div>
            </header>

            <main className="w-full p-1">
                {/* Header Card */}
                <div className="bg-white rounded-xl shadow-sm p-2 mb-1 border-l-4 border-blue-600">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-[14pt] font-bold text-gray-900 leading-tight">Live scoring round: {selectedRound ? new Date(selectedRound.date).toLocaleDateString() : ''}</h2>
                            <p className="text-gray-600 text-[11pt] font-medium mt-0.5">
                                {course?.name || 'City Park North'} • P:{course?.tee_boxes?.[0]?.par || 68} R:{course?.tee_boxes?.[0]?.rating || 63.8} S:{course?.tee_boxes?.[0]?.slope || 100}
                            </p>
                        </div>
                    </div>

                    {/* Round Selection & Creation */}

                    <div className="mt-2 flex items-center justify-between gap-1 text-[12pt] text-gray-500 font-medium">
                        <div className="flex items-center gap-1">
                            <span>Updated: {mounted ? lastUpdate.toLocaleTimeString() : '...'}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>{selectedPlayers.length} players</span>
                        </div>
                    </div>

                </div>

                {/* My Group - Interactive */}
                <div className="mb-1 bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-2 flex justify-between items-center rounded-t-xl">
                        <h2 className="text-[14pt] font-bold">My Group</h2>
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
                                <div className="flex justify-between items-center mb-1 px-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-[12pt] font-bold text-gray-700">Hole {activeHole}</h3>
                                        <div className="bg-gray-700 text-white text-[10pt] px-2 py-0.5 rounded font-bold uppercase flex gap-1.5 items-center">
                                            <span>Par {course.holes.find((h: any) => h.hole_number === activeHole)?.par}</span>
                                            <span className="w-0.5 h-3 bg-white/30"></span>
                                            <span>Hardness {course.holes.find((h: any) => h.hole_number === activeHole)?.difficulty || 18}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10pt] text-gray-500 font-bold uppercase tracking-widest">Active</span>
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

                                    console.log('RENDER:', { playerName: player.name, activeHole, score, scoreType: typeof score });

                                    return (
                                        <div key={player.id} className="bg-blue-50/50 rounded-lg p-1.5 border border-blue-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="font-bold text-[12pt] text-gray-900 truncate">{player.name}</span>
                                                <span className="text-[12pt] text-gray-400 font-medium whitespace-nowrap">
                                                    ({total})
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => updateScore(player.id, -1)}
                                                    className="w-12 h-12 bg-red-500 text-white rounded-lg font-bold text-[14pt] hover:bg-red-600 transition active:scale-95 flex items-center justify-center shadow-sm"
                                                >
                                                    −
                                                </button>
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-[14pt] font-bold border-2 ${score !== null
                                                    ? getScoreColor(score, par) + ' border-gray-300'
                                                    : 'bg-gray-100 border-dashed border-gray-300 text-gray-400'
                                                    }`}>
                                                    {score !== null ? score : par}
                                                </div>
                                                <button
                                                    onClick={() => updateScore(player.id, 1)}
                                                    className="w-12 h-12 bg-green-500 text-white rounded-lg font-bold text-[14pt] hover:bg-green-600 transition active:scale-95 flex items-center justify-center shadow-sm"
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
                                <span>💾</span> Save Hole
                            </button>
                        </div>
                    )}


                    {/* Full Scorecard - Card Layout per Player */}
                    <div className="bg-white border-t border-gray-200 mt-3 rounded-t-xl overflow-hidden">
                        <div className="bg-gray-50 px-2 py-1 border-b border-gray-200 text-[14pt] font-bold text-gray-500 uppercase tracking-wider text-center">
                            Live Score Summary
                        </div>
                        <div className="p-2 space-y-4">
                            {[...selectedPlayers].sort((a, b) => {
                                const aData = getLiveToParData(a.id);
                                const bData = getLiveToParData(b.id);

                                // Get player data from allPlayers to access handicap
                                const aPlayer = allPlayers.find(p => p.id === a.id);
                                const bPlayer = allPlayers.find(p => p.id === b.id);

                                // Helper function to calculate course handicap
                                const getCourseHandicap = (playerIndex: number, teeBoxName: string | null) => {
                                    // Find the tee box for this course
                                    const teeBox = course.tee_boxes?.find((tb: any) =>
                                        tb.name.toLowerCase() === (teeBoxName || 'white').toLowerCase()
                                    );
                                    if (!teeBox) return 0;
                                    // Course Handicap = Handicap Index × (Slope Rating ÷ 113)
                                    return Math.round(playerIndex * (teeBox.slope / 113));
                                };

                                // Calculate net scores (gross - handicap for completed holes using USGA allocation)
                                const aCourseHcp = getCourseHandicap(aPlayer?.index || 0, aPlayer?.preferred_tee_box || null);
                                const bCourseHcp = getCourseHandicap(bPlayer?.index || 0, bPlayer?.preferred_tee_box || null);

                                const completedHolesList = course.holes.filter((h: any) => isHoleCompleted(h.hole_number));

                                // Calculate handicap strokes using USGA allocation for player A
                                let aHcpForCompleted = 0;
                                completedHolesList.forEach((hole: any) => {
                                    const holeDifficulty = hole.difficulty || 18;
                                    if (aCourseHcp >= holeDifficulty) aHcpForCompleted++;
                                    if (aCourseHcp >= (holeDifficulty + 18)) aHcpForCompleted++;
                                });

                                // Calculate handicap strokes using USGA allocation for player B
                                let bHcpForCompleted = 0;
                                completedHolesList.forEach((hole: any) => {
                                    const holeDifficulty = hole.difficulty || 18;
                                    if (bCourseHcp >= holeDifficulty) bHcpForCompleted++;
                                    if (bCourseHcp >= (holeDifficulty + 18)) bHcpForCompleted++;
                                });

                                const aNet = aData.liveGross - aHcpForCompleted;
                                const bNet = bData.liveGross - bHcpForCompleted;

                                // Leaders (lowest net) first
                                if (aData.anySaved && bData.anySaved) {
                                    if (aNet !== bNet) {
                                        return aNet - bNet;
                                    }
                                } else if (aData.anySaved) {
                                    return -1; // a has scores, b doesn't -> a first
                                } else if (bData.anySaved) {
                                    return 1; // b has scores, a doesn't -> b first
                                }

                                // Secondary sort: Last name
                                const aLastName = a.name.split(' ').pop() || a.name;
                                const bLastName = b.name.split(' ').pop() || b.name;
                                return aLastName.localeCompare(bLastName);
                            }).map((player) => {
                                // Calculate live totals based ONLY on saved holes
                                const { liveGross, liveToPar, anySaved } = getLiveToParData(player.id);
                                const toParDisplay = !anySaved ? 'E' : liveToPar === 0 ? 'E' : liveToPar > 0 ? `+${liveToPar}` : liveToPar;

                                // Get player's full data to access handicap
                                const playerData = allPlayers.find(p => p.id === player.id);

                                // Find the round_player record for this player in this round
                                const roundPlayer = selectedRound?.players?.find((rp: any) => rp.player_id === player.id);

                                // Calculate course handicap using USGA formula: (Index * Slope / 113) + (Rating - Par)
                                const getCourseHandicap = (playerIndex: number, teeBoxName: string | null) => {
                                    const searchName = (teeBoxName || 'white').toLowerCase();
                                    const teeBox = course.tee_boxes?.find((tb: any) => {
                                        const tbName = tb.name.toLowerCase();
                                        return tbName === searchName || tbName.includes(searchName) || searchName.includes(tbName);
                                    });
                                    if (!teeBox) return 0;

                                    const slope = teeBox.slope || 113;
                                    const rating = teeBox.rating || 0;
                                    const par = course.holes.reduce((sum: number, h: any) => sum + h.par, 0);

                                    return Math.round((playerIndex * (slope / 113)) + (rating - par));
                                };

                                // Use stored course handicap from round_player if available, otherwise calculate it
                                const courseHandicap = roundPlayer?.course_handicap ?? getCourseHandicap(playerData?.index || 0, playerData?.preferred_tee_box || null);

                                // Calculate handicap strokes for completed holes using USGA allocation
                                // Strokes are allocated based on hole difficulty (1 = hardest, 18 = easiest)
                                const completedHolesList = course.holes.filter((h: any) => isHoleCompleted(h.hole_number));
                                let handicapForCompletedHoles = 0;

                                completedHolesList.forEach((hole: any) => {
                                    const holeDifficulty = hole.difficulty || 18; // Default to easiest if no difficulty set
                                    // Player gets a stroke on this hole if their course handicap >= hole difficulty
                                    if (courseHandicap >= holeDifficulty) {
                                        handicapForCompletedHoles++;
                                    }
                                    // For handicaps > 18, player gets 2 strokes on holes where handicap >= (difficulty + 18)
                                    if (courseHandicap >= (holeDifficulty + 18)) {
                                        handicapForCompletedHoles++;
                                    }
                                });

                                const liveNet = liveGross - handicapForCompletedHoles;
                                const displayTeeName = roundPlayer?.tee_box_name || playerData?.preferred_tee_box || 'White';

                                return (
                                    <div key={player.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                        {/* Player Header - e before name, then Grs, Hcp, Net */}
                                        <div className="bg-blue-600 text-white px-3 py-1.5 flex justify-center items-center gap-2 text-[14pt] font-bold">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="bg-white text-red-600 px-2 rounded font-bold min-w-[2.5rem] text-center">{toParDisplay}</span>
                                                <span className="truncate">{player.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-[10pt] opacity-70 font-normal uppercase">Grs</span>
                                                    <span>{liveGross}</span>
                                                </div>
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-[10pt] opacity-70 font-normal uppercase">Hcp</span>
                                                    <span>{handicapForCompletedHoles}<span className="text-[10pt] opacity-60 font-normal">/{courseHandicap}</span></span>
                                                </div>
                                                <div className="flex flex-col items-center leading-none bg-blue-700/50 px-2 py-0.5 rounded">
                                                    <span className="text-[10pt] opacity-70 font-normal uppercase">Net</span>
                                                    <span>{liveNet}</span>
                                                </div>
                                            </div>
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
            </main >

            <LivePlayerSelectionModal
                isOpen={isPlayerModalOpen}
                onClose={() => setIsPlayerModalOpen(false)}
                allPlayers={allPlayers}
                selectedIds={selectedPlayerIds}
                onSelectionChange={handlePlayerSelectionFromModal}
            />
        </div >
    );
}
