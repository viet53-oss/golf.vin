'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDraftRound } from '@/app/actions';

export default function CreateRoundButton() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        startTransition(async () => {
            try {
                const newRoundId = await createDraftRound();
                router.push(`/scores/${newRoundId}/edit`);
            } catch (error) {
                console.error('Failed to create round:', error);
                alert('Failed to create new round. Ensure courses exist.');
            }
        });
    };

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            className="bg-black hover:bg-gray-800 text-white text-[14pt] font-bold px-1 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
        >
            {isPending ? 'Creating...' : 'New'}
        </button>
    );
}
