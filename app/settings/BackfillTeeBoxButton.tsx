'use client';

import { useState } from 'react';
import { backfillTeeBoxData } from '@/app/actions/backfill-tee-box-data';

export default function BackfillTeeBoxButton() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleBackfill = async () => {
        if (!confirm('This will update all historical rounds with their tee box data (par, rating, slope). Continue?')) {
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await backfillTeeBoxData();
            if (response.success) {
                setResult(`✅ ${response.message}`);
            } else {
                setResult(`❌ Error: ${response.message}`);
            }
        } catch (error) {
            setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 text-[14pt] mb-2">Backfill Tee Box Data</h3>
            <p className="text-sm text-gray-600 mb-3">
                Updates all historical rounds with saved tee box data (par, rating, slope).
                Run this once to fix old rounds that show incorrect course data.
            </p>
            <button
                onClick={handleBackfill}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-full text-[14pt] font-bold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? 'Processing...' : 'Run Backfill'}
            </button>
            {result && (
                <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200 text-sm">
                    {result}
                </div>
            )}
        </div>
    );
}
