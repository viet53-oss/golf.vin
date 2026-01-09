'use client';

import { useState } from 'react';
import { checkVietRounds } from '@/app/actions/check-viet-rounds';
import { checkCoursePar } from '@/app/actions/check-course-par';

export default function DiagnosticButton() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleCheck = async () => {
        setLoading(true);
        setResult(null);

        try {
            const [vietData, courseData] = await Promise.all([
                checkVietRounds(),
                checkCoursePar()
            ]);
            setResult({ vietRounds: vietData, courseData });
        } catch (error) {
            setResult({ success: false, message: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 text-[14pt] mb-2">Diagnostic: Check Data</h3>
            <button
                onClick={handleCheck}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-full text-[14pt] font-bold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? 'Checking...' : 'Check Data'}
            </button>
            {result && (
                <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200 text-xs overflow-auto max-h-96">
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
