'use client';

import { useState, useEffect } from 'react';

interface Player {
    id: string;
    name: string;
    index?: number;
    preferred_tee_box?: string | null;
}

interface TeeBox {
    id: string;
    name: string;
    rating: number;
    slope: number;
}

export function LivePlayerSelectionModal({
    allPlayers,
    selectedIds,
    playersInRound = [],
    onSelectionChange,
    isOpen,
    onClose,
    courseData
}: {
    allPlayers: Player[];
    selectedIds: string[];
    playersInRound?: string[];
    onSelectionChange: (ids: string[]) => void;
    isOpen: boolean;
    onClose: () => void;
    courseData?: {
        teeBoxes: TeeBox[];
        par: number;
    } | null;
}) {
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

    // Sync local state with prop only when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalSelectedIds(selectedIds);
        }
    }, [isOpen]); // Remove selectedIds from dependencies

    if (!isOpen) return null;

    const togglePlayer = (id: string) => {
        setLocalSelectedIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        onSelectionChange(localSelectedIds);
        onClose();
    };

    // Sort players by last name
    const sortedPlayers = [...allPlayers].sort((a, b) => {
        const aLastName = a.name.split(' ').pop() || a.name;
        const bLastName = b.name.split(' ').pop() || b.name;
        return aLastName.localeCompare(bLastName);
    });

    // Calculate course handicap for a player
    const getCourseHandicap = (player: Player): number | null => {
        if (!player.index || !courseData) return null;

        // Find the player's preferred tee box
        const preferredTee = courseData.teeBoxes.find(t =>
            player.preferred_tee_box && t.name.toLowerCase().includes(player.preferred_tee_box.toLowerCase())
        );

        // Fallback to white tee if no preference
        const teeBox = preferredTee || courseData.teeBoxes.find(t =>
            t.name.toLowerCase().includes('white')
        ) || courseData.teeBoxes[0];

        if (!teeBox) return null;

        // Course Handicap = (Handicap Index × Slope Rating / 113) + (Course Rating - Par)
        const courseHandicap = (player.index * teeBox.slope / 113) + (teeBox.rating - courseData.par);
        return Math.round(courseHandicap);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full h-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 bg-white flex justify-between items-center">
                    <h2 className="text-[18pt] font-bold text-left">Select Players in My Group</h2>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>

                {/* Body - Player Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sortedPlayers.map(player => {
                            const isSelected = localSelectedIds.includes(player.id);
                            const isInRound = playersInRound.includes(player.id);
                            const isDisabled = isInRound && !selectedIds.includes(player.id);

                            return (
                                <button
                                    key={player.id}
                                    onClick={() => togglePlayer(player.id)}
                                    disabled={isDisabled}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${isDisabled
                                        ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                                        : isSelected
                                            ? 'border-blue-500 bg-blue-50 shadow-sm cursor-pointer'
                                            : 'border-gray-100 bg-white hover:border-gray-200 cursor-pointer'
                                        }`}
                                >
                                    <div className={`w-8 h-8 shrink-0 rounded flex items-center justify-center border-2 transition-colors ${isDisabled
                                        ? 'bg-gray-200 border-gray-300'
                                        : isSelected
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'bg-white border-gray-300'
                                        }`}>
                                        {isSelected && !isDisabled && (
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[18pt] font-bold ${isDisabled ? 'text-gray-400' : isSelected ? 'text-blue-800' : 'text-gray-700'
                                                }`}>
                                                {player.name}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {/* Course Handicap */}
                                                {(() => {
                                                    const courseHcp = getCourseHandicap(player);
                                                    return courseHcp !== null && (
                                                        <span className={`text-[14pt] font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            ({courseHcp})
                                                        </span>
                                                    );
                                                })()}
                                                {/* Tee Box Indicator */}
                                                {player.preferred_tee_box && (
                                                    <span className={`px-2 py-0.5 rounded text-[12pt] font-bold ${isDisabled
                                                        ? 'bg-gray-200 text-gray-400'
                                                        : player.preferred_tee_box.toLowerCase().includes('white')
                                                            ? 'bg-white text-black border border-black'
                                                            : player.preferred_tee_box.toLowerCase().includes('gold')
                                                                ? 'bg-yellow-400 text-black'
                                                                : 'bg-gray-300 text-gray-700'
                                                        }`}>
                                                        {player.preferred_tee_box.toLowerCase().includes('white')
                                                            ? 'W'
                                                            : player.preferred_tee_box.toLowerCase().includes('gold')
                                                                ? 'G'
                                                                : player.preferred_tee_box.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isDisabled && (
                                            <div className="text-[12pt] text-gray-500 italic mt-1">Already selected by another phone</div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-1 py-2 rounded-full text-[14pt] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="bg-black text-white px-1 py-2 rounded-full text-[14pt] font-bold shadow-lg transition-all active:scale-95"
                    >
                        Confirm ({localSelectedIds.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
