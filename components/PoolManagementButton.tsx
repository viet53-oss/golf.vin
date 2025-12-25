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
                className="bg-[#1f2937] text-white px-4 py-1.5 rounded-md text-[11pt] font-bold hover:bg-black transition-colors"
            >
                Select Players ({currentParticipantIds.length})
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
