'use client';

import { useState, useTransition } from 'react';

const RefreshCw = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" />
    </svg>
);

const CheckCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const AlertCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
);

import { recalculateAllHandicaps } from '../actions/recalculate-handicaps';

export default function RecalculateButton() {
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleRecalculate = () => {
        setStatus('idle');
        startTransition(async () => {
            const result = await recalculateAllHandicaps();
            if (result.success) {
                setStatus('success');
                // Reset success message after 3 seconds
                setTimeout(() => setStatus('idle'), 3000);
            } else {
                setStatus('error');
            }
        });
    };

    return (
        <div className="space-y-2">
            <button
                onClick={handleRecalculate}
                disabled={isPending}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
                <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                {isPending ? 'Recalculating...' : 'Recalculate All Handicaps'}
            </button>

            {status === 'success' && (
                <div className="flex items-center gap-2 text-green-600 text-[14pt] font-medium animate-in fade-in slide-in-from-top-1">
                    <CheckCircle className="w-4 h-4" />
                    Successfully updated all handicaps!
                </div>
            )}

            {status === 'error' && (
                <div className="flex items-center gap-2 text-red-600 text-[14pt] font-medium animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4" />
                    Failed to recalculate. Check logs.
                </div>
            )}
        </div>
    );
}
