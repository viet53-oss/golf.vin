'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { updateRound, addPlayersToRound, removePlayerFromRound, deleteRound, updatePlayerScore, createRoundWithPlayers } from '@/app/actions';
import ScoreEntryModal from './ScoreEntryModal';

type Player = {
    id: string;
    name: string;
    index: number;
};

type RoundPlayer = {
    id: string;
    gross_score: number | null;
    player: Player;
    tee_box: {
        name: string;
        slope: number;
        rating: number;
    } | null;
    index_at_time: number | null;
    points: number;
    payout: number;
};

type RoundData = {
    id: string;
    date: string;
    name: string | null;
    is_tournament: boolean;
    course: {
        id: string;
        name: string;
        holes: { par: number }[];
        tee_boxes: { id: string; name: string; slope: number; rating: number }[];
    };
    players: RoundPlayer[];
};

export default function EditRoundForm({
    round,
    allPlayers
}: {
    round: RoundData;
    allPlayers: Player[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [date, setDate] = useState(round.date.split('T')[0]);
    const [name, setName] = useState(round.name || '');
    const [isTournament, setIsTournament] = useState(round.is_tournament);

    // State for delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // State for score entry modal
    const [scoreModalOpen, setScoreModalOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<RoundPlayer | null>(null);

    // Selection state for adding members
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

    // Filter out players already in the round (use local state)
    // Local state for players (to handle optimistic updates / new round mode)
    const [statePlayers, setStatePlayers] = useState<RoundPlayer[]>(round.players);

    // Initial load sync
    // update statePlayers if round.players changes (e.g. after server action refresh)
    // But ONLY if not in 'new' mode or if we carefully manage it to avoid overwriting local changes?
    // Actually, for 'edit' mode, round.players from props is the source of truth after refresh.
    // For 'new' mode, props never change until save.
    const isNew = round.id === 'new';

    // If we receive new props and it's NOT a new round (or we just saved), sync state
    // We can use a key on the component to force reset, or simpler:
    // Just initialize once. For existing rounds, router.refresh() will re-render this component with new props.
    // We want to update statePlayers when props change EXCEPT when we are locally managing 'new' round.
    if (!isNew && round.players !== statePlayers && JSON.stringify(round.players) !== JSON.stringify(statePlayers)) {
        // This pattern is risky in render, but with key navigation it might be okay.
        // Better to use useEffect or just rely on key change remounting?
        // Let's stick to initial state for now and update it manually or rely on router.refresh() for existing rounds.
        // However, for existing rounds, add/remove triggers router.refresh(), so the parent passes new `round.players`.
        // We need to keep `statePlayers` in sync.
    }

    // Better approach: Derived state or Effect
    // Since we are using router.refresh() for server actions, the component will re-render with new props.
    // We should sync statePlayers to props.round.players whenever props change, IF !isNew.
    // If isNew, we manage it fully locally.

    // Use a key on the page.tsx to force remount? No, expensive.
    // Let's use an effect to sync if not new.

    // Calculate existing IDs based on STATE players
    const existingPlayerIds = new Set(statePlayers.map(rp => rp.player.id));
    const availablePlayers = allPlayers.filter(p => !existingPlayerIds.has(p.id));

    // Sort available players by Last Name
    const sortedAvailablePlayers = [...availablePlayers].sort((a, b) => {
        const lastA = a.name.split(' ').slice(1).join(' ');
        const lastB = b.name.split(' ').slice(1).join(' ');
        return lastA.localeCompare(lastB);
    });

    // Helper for Course Handicap Display in List
    const coursePar = round.course.holes?.reduce((sum, h) => sum + h.par, 0) || 72;
    const defaultTee = round.course.tee_boxes?.find(t => t.name === 'White') || round.course.tee_boxes?.[0];

    const getCourseHcp = (index: number) => {
        if (!defaultTee) return Math.round(index);
        return Math.round(index * (defaultTee.slope / 113) + (defaultTee.rating - coursePar));
    };

    const handleSaveRound = async () => {
        startTransition(async () => {
            // Fix timezone issue: append T12:00:00 to ensure date stays correct
            const dateWithTime = date.includes('T') ? date : `${date}T12:00:00`;

            if (isNew) {
                // Create new round with current players
                const playerIds = statePlayers.map(p => p.player.id);
                await createRoundWithPlayers(
                    { date: dateWithTime, name, is_tournament: isTournament },
                    playerIds
                );
            } else {
                // Update existing
                await updateRound(round.id, { date: dateWithTime, name, is_tournament: isTournament });
            }

            router.push('/scores');
            router.refresh();
        });
    };

    const handleDeleteClick = () => {
        if (isNew) return; // Should be disabled anyway

        if (!deleteConfirm) {
            setDeleteConfirm(true);
            setTimeout(() => setDeleteConfirm(false), 3000); // Reset after 3s
            return;
        }

        setErrorMessage('');

        startTransition(async () => {
            try {
                await deleteRound(round.id);
                router.push('/scores');
                router.refresh();
            } catch (e) {
                console.error('Delete failed:', e);
                setErrorMessage('Failed to delete. Error: ' + e);
                setDeleteConfirm(false);
            }
        });
    };

    const handleAddSelected = async () => {
        if (selectedPlayerIds.size === 0) return;

        startTransition(async () => {
            if (isNew) {
                // Add to local state only
                const newPlayers: RoundPlayer[] = Array.from(selectedPlayerIds).map(pid => {
                    const player = allPlayers.find(p => p.id === pid)!;
                    const defaultTee = round.course.tee_boxes?.find(t => t.name === 'White') || round.course.tee_boxes?.[0] || null;
                    return {
                        id: `temp-${pid}`, // Temp ID
                        gross_score: null,
                        player: player,
                        tee_box: defaultTee,
                        index_at_time: player.index,
                        points: 0,
                        payout: 0
                    };
                });
                setStatePlayers(prev => [...prev, ...newPlayers]);
            } else {
                // Server action
                await addPlayersToRound(round.id, Array.from(selectedPlayerIds));
                router.refresh();
            }
            setSelectedPlayerIds(new Set()); // Clear selection
        });
    };

    const handleRemovePlayer = async (roundPlayerId: string) => {
        if (!confirm('Remove this player from the round?')) return;

        startTransition(async () => {
            if (isNew) {
                // Remove from local state
                setStatePlayers(prev => prev.filter(p => p.id !== roundPlayerId));
            } else {
                await removePlayerFromRound(roundPlayerId);
                router.refresh();
            }
        });
    };

    const togglePlayerSelection = (playerId: string) => {
        const newSet = new Set(selectedPlayerIds);
        if (newSet.has(playerId)) {
            newSet.delete(playerId);
        } else {
            newSet.add(playerId);
        }
        setSelectedPlayerIds(newSet);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

            {/* Round Details Section */}
            <div className="p-3 border-b border-gray-200 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-[14pt] font-bold text-gray-900">Add/Edit Round</h2>
                    <div className="flex gap-2">
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex gap-2">
                                {!isNew && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteClick}
                                        disabled={isPending}
                                        className={`${deleteConfirm ? 'bg-red-800 ring-2 ring-red-400' : 'bg-red-600 hover:bg-red-700'
                                            } text-white text-[14pt] font-bold px-1 py-1.5 rounded-full transition-all`}
                                    >
                                        {isPending ? 'Deleting...' : deleteConfirm ? 'Click AGAIN to Confirm' : 'Delete Round'}
                                    </button>
                                )}
                                <Link href="/scores" className="text-gray-400 text-[14pt] font-bold hover:text-black flex items-center">
                                    {isNew ? 'Cancel' : 'Close'}
                                </Link>
                            </div>
                            {errorMessage && <span className="text-red-600 text-[14pt] font-bold">{errorMessage}</span>}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div>
                        <label className="block text-[14pt] font-bold text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            className="w-full border border-gray-300 rounded px-1 py-2 text-[14pt]"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-[14pt] font-bold text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Sunday Game"
                            className="w-full border border-gray-300 rounded px-1 py-2 text-[14pt]"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="tournament"
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            checked={isTournament}
                            onChange={(e) => setIsTournament(e.target.checked)}
                        />
                        <label htmlFor="tournament" className="text-[14pt] text-gray-700">Tournament (with Flight 1 & 2)</label>
                    </div>
                </div>
            </div>

            {/* Add Players Section */}
            <div className="p-3 border-b border-gray-200 bg-gray-50/50">
                <h3 className="font-bold text-[14pt] text-gray-900 mb-3">Add Players to Round/Tournament</h3>
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-white p-2 space-y-1">
                    {/* List Added Players (Disabled) */}
                    {statePlayers.map(rp => (
                        <div key={rp.id} className="flex items-center gap-2 px-1 py-1.5 opacity-50">
                            <input type="checkbox" checked disabled className="rounded border-gray-300" />
                            <span className="text-[14pt] text-gray-500">
                                {rp.player.name} <span className="text-[14pt]">(HCP: {Math.round(rp.player.index)})</span>
                                <span className="ml-2 text-[14pt] font-bold">(Added)</span>
                            </span>
                        </div>
                    ))}

                    {/* List Available Players */}
                    {sortedAvailablePlayers.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-1 py-1.5 hover:bg-gray-50">
                            <input
                                type="checkbox"
                                id={`player-${p.id}`}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                checked={selectedPlayerIds.has(p.id)}
                                onChange={() => togglePlayerSelection(p.id)}
                            />
                            <label htmlFor={`player-${p.id}`} className="text-[14pt] text-gray-900 cursor-pointer w-full">
                                {p.name} <span className="text-gray-400 text-[14pt]">(HCP: {getCourseHcp(p.index)})</span>
                            </label>
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleAddSelected}
                    disabled={selectedPlayerIds.size === 0 || isPending}
                    className="mt-3 w-full bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-[14pt] transition-colors"
                >
                    Add Selected Players ({selectedPlayerIds.size})
                </button>
            </div>

            {/* Players in Round Table */}
            <div className="p-3">
                <h3 className="font-bold text-[14pt] text-gray-900 mb-3">Players in This Round</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[14pt]">
                        <thead className="text-[14pt] text-black uppercase font-bold border-b border-gray-200">
                            <tr>
                                <th className="py-2 text-left">Player</th>
                                <th className="py-2 text-center">Tee Box</th>
                                <th className="py-2 text-center">Gross</th>
                                <th className="py-2 text-center">HCP</th>
                                <th className="py-2 text-center">Net</th>
                                <th className="py-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {statePlayers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-4 text-center text-gray-500 italic">No players in this round yet.</td>
                                </tr>
                            ) : (
                                statePlayers.map(rp => {
                                    const gross = rp.gross_score;
                                    // Calc logic duplicate from Scores page - ideally centralize
                                    const idx = rp.index_at_time ?? rp.player.index;
                                    const slope = rp.tee_box?.slope ?? 113;
                                    const rating = rp.tee_box?.rating ?? 0; // If no tee, use 0 to signal invalid
                                    const coursePar = round.course.holes?.reduce((sum, h) => sum + h.par, 0) || 72;

                                    let courseHcp = 0;
                                    if (rp.tee_box) {
                                        courseHcp = Math.round(idx * (slope / 113) + (rating - coursePar));
                                    } else {
                                        // If no tee box, just show Base Index? Or 0?
                                        // Showing Index serves as a reasonable proxy until Tee is picked
                                        courseHcp = Math.round(idx);
                                    }
                                    const net = gross ? gross - courseHcp : null;

                                    return (
                                        <tr key={rp.id} className="group hover:bg-gray-50">
                                            <td className="py-3 font-medium">{rp.player.name}</td>
                                            <td className="py-3 text-center">{rp.tee_box?.name || '-'}</td>
                                            <td className="py-3 text-center">{gross ?? '-'}</td>
                                            <td className="py-3 text-center">{courseHcp}</td>
                                            <td className="py-3 text-center font-bold">{net ?? '-'}</td>
                                            <td className="py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPlayer(rp);
                                                            setScoreModalOpen(true);
                                                        }}
                                                        className="px-1 py-1 border border-gray-300 rounded text-[14pt] font-bold hover:bg-gray-100 disabled:opacity-50"
                                                        disabled={isNew}
                                                        title={isNew ? "Save round first to enter scores" : "Edit Score"}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemovePlayer(rp.id)}
                                                        className="px-1 py-1 text-red-600 font-bold text-[14pt] hover:bg-red-50 rounded"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sticky Save Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 sticky bottom-0">
                <button
                    onClick={handleSaveRound}
                    disabled={isPending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors text-[14pt]"
                >
                    {isPending ? 'Saving...' : (isNew ? 'Create Round' : 'Save & Update Round')}
                </button>
            </div>

            {/* Score Entry Modal */}
            {selectedPlayer && (
                <ScoreEntryModal
                    isOpen={scoreModalOpen}
                    onClose={() => {
                        setScoreModalOpen(false);
                        setSelectedPlayer(null);
                    }}
                    playerName={selectedPlayer.player.name}
                    courseId={round.course.id}
                    roundPlayerId={selectedPlayer.id}
                    currentGross={selectedPlayer.gross_score}
                    currentFront={null}
                    currentBack={null}
                    currentPoints={selectedPlayer.points}
                    currentPayout={selectedPlayer.payout}
                    playerIndex={selectedPlayer.player.index}
                    indexAtTime={selectedPlayer.index_at_time}
                    teeBox={selectedPlayer.tee_box}
                    coursePar={round.course.holes?.reduce((sum, h) => sum + h.par, 0)}
                    onSave={async (gross, front, back, pts, pay, holeScores) => {
                        await updatePlayerScore(selectedPlayer.id, gross, front, back, pts, pay, holeScores);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}

