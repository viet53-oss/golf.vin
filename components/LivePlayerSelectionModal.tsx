'use client';

import { useState, useEffect } from 'react';

interface Player {
    id: string;
    name: string;
}

export function LivePlayerSelectionModal({
    allPlayers,
    selectedIds,
    playersInRound = [],
    onSelectionChange,
    isOpen,
    onClose
}: {
    allPlayers: Player[];
    selectedIds: string[];
    playersInRound?: string[];
    onSelectionChange: (ids: string[]) => void;
    isOpen: boolean;
    onClose: () => void;
}) {
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

    // Sync local state with prop when modal opens or prop updates
    useEffect(() => {
        if (isOpen) {
            setLocalSelectedIds(selectedIds);
        }
    }, [isOpen, selectedIds]);

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

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full h-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-4 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600">
                    <h2 className="text-[18pt] font-bold text-white tracking-tight">Select Players in My Group</h2>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body - Player Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sortedPlayers.map(player => {
                            const isSelected = localSelectedIds.includes(player.id);
                            const isInRound = playersInRound.includes(player.id);

                            return (
                                <button
                                    key={player.id}
                                    onClick={() => togglePlayer(player.id)}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                        ? 'border-blue-500 bg-blue-50 shadow-sm cursor-pointer'
                                        : 'border-gray-100 bg-white hover:border-gray-200 cursor-pointer'
                                        }`}
                                >
                                    <div className={`w-8 h-8 shrink-0 rounded flex items-center justify-center border-2 transition-colors ${isSelected
                                        ? 'bg-blue-600 border-blue-600'
                                        : 'bg-white border-gray-300'
                                        }`}>
                                        {isSelected && (
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[18pt] font-bold ${isSelected ? 'text-blue-800' : 'text-gray-700'
                                                }`}>
                                                {player.name}
                                            </span>
                                            {isInRound && !isSelected && (
                                                <span className="text-[10pt] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                    Active
                                                </span>
                                            )}
                                        </div>
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
