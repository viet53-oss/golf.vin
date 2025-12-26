'use client';

import { useState } from 'react';
import { ManagePoolModal } from './ManagePoolModal';

interface Player {
    id: string;
    name: string;
}

export function PoolManagementButton({
    roundId,
    allPlayers,
    currentParticipantIds
}: {
    roundId: string;
    allPlayers: Player[];
    currentParticipantIds: string[];
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-black text-white px-4 py-2 rounded-full text-[12pt] sm:text-[16pt] font-bold hover:bg-gray-800 transition-colors shadow-sm"
            >
                Pick Players ({currentParticipantIds.length})
            </button>

            <ManagePoolModal
                roundId={roundId}
                allPlayers={allPlayers}
                initialSelectedIds={currentParticipantIds}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}
