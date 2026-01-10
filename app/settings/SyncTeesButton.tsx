'use client';

import { useState } from 'react';
import { syncAllRoundsToPreferredTees } from '@/app/actions/sync-all-tees';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';

export default function SyncTeesButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const router = useRouter();

    const handleSync = async () => {
        if (!confirm('This will go through every round in history and reassign players to their preferred tee box (White, Gold, etc.) at THAT course. Use this if you changed tee box definitions or IDs. Continue?')) {
            return;
        }

        setIsLoading(true);
        setStatus('Syncing...');

        try {
            const result = await syncAllRoundsToPreferredTees();
            if (result.success) {
                setStatus(result.message || `Success! Updated ${result.count} entries.`);
                setTimeout(() => setStatus(null), 10000);
                router.refresh();
            } else {
                setStatus('Error: ' + result.error);
                setTimeout(() => setStatus(null), 5000);
            }
        } catch (e) {
            setStatus('Critical Error occurred.');
            setTimeout(() => setStatus(null), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-3">
            <button
                onClick={handleSync}
                disabled={isLoading}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 text-[15pt]"
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <RefreshCw className="w-5 h-5" />
                )}
                {isLoading ? 'Syncing...' : 'Sync All Rounds to Preferred Tees'}
            </button>
            {status && (
                <div className={`text-[12pt] font-bold p-3 rounded-lg ${status.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700 animate-pulse'}`}>
                    {status}
                </div>
            )}
        </div>
    );
}
