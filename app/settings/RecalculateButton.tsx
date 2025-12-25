'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
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
                className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
            >
                <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                {isPending ? 'Recalculating...' : 'Recalculate All Handicaps'}
            </button>

            {status === 'success' && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                    <CheckCircle className="w-4 h-4" />
                    Successfully updated all handicaps!
                </div>
            )}

            {status === 'error' && (
                <div className="flex items-center gap-2 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4" />
                    Failed to recalculate. Check logs.
                </div>
            )}
        </div>
    );
}
