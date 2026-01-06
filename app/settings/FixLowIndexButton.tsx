'use client';

import { useState } from 'react';
import { resetLowHandicapIndexes } from '../actions/fix-low-index';

export default function FixLowIndexButton() {
    const [isPending, setIsPending] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleFix = () => {
        if (!confirm('This will reset all low handicap indexes to null. Continue?')) return;

        setIsPending(true);
        setStatus('idle');
        resetLowHandicapIndexes()
            .then(result => {
                if (result.success) {
                    setStatus('success');
                    setMessage(result.message);
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    setStatus('error');
                    setMessage(result.message);
                }
            })
            .catch(() => {
                setStatus('error');
                setMessage('An error occurred');
            })
            .finally(() => setIsPending(false));
    };

    return (
        <div className="space-y-3">
            <button
                onClick={handleFix}
                disabled={isPending}
                className="w-full px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
                {isPending ? 'Fixing...' : '🔧 Emergency Fix: Reset Low Handicap Indexes'}
            </button>

            {status !== 'idle' && (
                <div className={`p-3 rounded-lg text-[14pt] font-medium ${status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message}
                </div>
            )}
        </div>
    );
}
