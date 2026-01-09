'use client';

import { useState } from 'react';
import { checkVietRounds } from '@/app/actions/check-viet-rounds';
import { checkCoursePar } from '@/app/actions/check-course-par';
import { checkLiveRounds } from '@/app/actions/check-live-rounds';

export default function DiagnosticButton() {
    const [data, setData] = useState<any>(null);

    const handleCheck = async () => {
        const vietRounds = await checkVietRounds();
        const courseData = await checkCoursePar();
        const liveRounds = await checkLiveRounds();
        setData({ vietRounds, courseData, liveRounds });
    };

    return (
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <button
                onClick={handleCheck}
                className="px-4 py-2 bg-purple-600 text-white rounded-full text-[14pt] font-bold hover:bg-purple-700 transition-colors"
            >
                Check Data
            </button>
            {data && (
                <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200 text-xs overflow-auto max-h-96">
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
