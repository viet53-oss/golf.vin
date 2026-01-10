'use client';

import { useState } from 'react';
import { backfillCourseName } from '@/app/actions/backfill-course-name';

export default function BackfillCourseNameButton() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleBackfill = async () => {
        if (!confirm('This will update all rounds with their course names. Continue?')) {
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await backfillCourseName();
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
            <h3 className="font-bold text-gray-900 text-[14pt] mb-2">Backfill Course Names</h3>
            <p className="text-sm text-gray-600 mb-3">
                Updates all historical rounds with the course name. Run this once to populate course names for old rounds.
            </p>
            <button
                onClick={handleBackfill}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-full text-[15pt] font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
