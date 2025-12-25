'use client';

import { useState } from 'react';
import { saveRoundWinnings } from '@/app/actions';

interface PayoutEntry {
    playerId: string;
    amount: number;
}

export function SaveWinningsButton({
    roundId,
    payouts
}: {
    roundId: string;
    payouts: PayoutEntry[]
}) {
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!confirm('This will save these calculated winnings to the database. Continue?')) {
            return;
        }

        setIsSaving(true);
        try {
            await saveRoundWinnings(roundId, payouts);
            alert('Winnings saved successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to save winnings.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="pt-4">
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] text-[16pt] uppercase tracking-wider flex items-center justify-center gap-2"
            >
                {isSaving ? (
                    <>
                        <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Saving...
                    </>
                ) : (
                    'Save Pool Results & Winnings'
                )}
            </button>
        </div>
    );
}
