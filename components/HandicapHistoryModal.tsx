'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Copy } from 'lucide-react';
import { getHandicapHistory, HandicapHistoryResponse } from '@/app/actions/get-handicap-history';
import { format } from 'date-fns';

interface HandicapHistoryModalProps {
    playerId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function HandicapHistoryModal({ playerId, isOpen, onClose }: HandicapHistoryModalProps) {
    const [data, setData] = useState<HandicapHistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && playerId) {
            setLoading(true);
            getHandicapHistory(playerId)
                .then(setData)
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, playerId]);

    if (!isOpen) return null;

    const handleCopyFullHistory = async () => {
        if (!data) return;

        let html = `
            <div style="font-family: sans-serif; color: #111; max-width: 800px;">
                <div style="margin-bottom: 20px; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">
                    <h2 style="margin: 0; font-size: 24px;">${data.player.name} - Handicap History</h2>
                    <div style="margin-top: 5px; font-size: 18px;">
                        Official Index: <b>${data.player.currentIndex.toFixed(1)}</b>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #e2e8f0;">
                    <thead>
                        <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0; text-align: left;">
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0;">Date</th>
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center;">Tee</th>
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center;">Grs</th>
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center;">Adj</th>
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center;">Diff</th>
                            <th style="padding: 10px; border-right: 1px solid #e2e8f0; text-align: center;">Hcp</th>
                            <th style="padding: 10px; text-align: center;">Index</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.history.forEach((item, idx) => {
            const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            const chBefore = calculateCourseHandicap(item.indexBefore, item.slope || 113, item.rating || 72, item.par || 72);
            const chAfter = calculateCourseHandicap(item.indexAfter, item.slope || 113, item.rating || 72, item.par || 72);
            const datePart = format(new Date(item.date), 'MM/dd/yy');

            html += `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0;">
                        <span style="font-weight: bold;">${datePart}</span>
                        ${item.used ? ' <br><span style="color: #16a34a; font-size: 10px; font-weight: bold;">[USED]</span>' : ''}
                    </td>
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0; text-align: center; color: #64748b;">
                        ${item.teeColor || 'Est'}<br>
                        <span style="font-size: 11px;">P${item.par}/R${item.rating}</span>
                    </td>
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0; text-align: center; font-weight: bold;">
                        ${item.gross || '-'}
                    </td>
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0; text-align: center; font-weight: bold;">
                        <span style="${item.adjusted && item.adjusted !== item.gross ? 'color: #dc2626;' : ''}">
                            ${item.adjusted || item.gross || '-'}
                        </span>
                    </td>
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0; text-align: center; font-weight: bold; background: #fdf2f2;">
                        ${item.differential.toFixed(1)}
                    </td>
                    <td style="padding: 8px; border-right: 1px solid #e2e8f0; text-align: center;">
                        <span style="color: #94a3b8; font-size: 12px;">${chBefore} &rarr;</span>
                        <br>
                        <b style="color: ${chAfter > chBefore ? '#dc2626' : '#16a34a'}; text-decoration: underline;">${chAfter}</b>
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <span style="color: #94a3b8; font-size: 12px;">${item.indexBefore.toFixed(1)} &rarr;</span>
                        <br>
                        <b style="color: ${item.indexAfter > item.indexBefore ? '#dc2626' : '#16a34a'};">${item.indexAfter.toFixed(1)}</b>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <p style="margin-top: 15px; font-size: 12px; color: #94a3b8; text-align: center;">
                    City Park Golf Club - Handicap History Report
                </p>
            </div>
        `;

        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([html.replace(/<[^>]*>?/gm, "")], { type: 'text/plain' });

        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText
                })
            ]);
            alert('Handicap history copied as a clean table!');
        } catch (e) {
            console.error(e);
            alert('Failed to copy');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in fade-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            {/* Header */}
            <div className="bg-slate-50 border-b border-gray-100 px-1 py-4 flex justify-between items-center shrink-0 safe-top">
                <div className="flex flex-col">
                    <h2 className="text-[15pt] font-black text-gray-900 leading-tight">
                        {data?.player.name || 'Loading...'}
                    </h2>
                    <p className="text-[14pt] text-blue-600 font-bold">Handicap History</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopyFullHistory}
                        className="p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-full transition-colors flex items-center justify-center group"
                        title="Copy Full History"
                    >
                        <Copy size={24} className="text-gray-400 group-hover:text-gray-600" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={28} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-1 py-4 bg-slate-50">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                        <p className="text-[14pt] text-gray-400 font-medium">Calculating Handicap History...</p>
                    </div>
                ) : (data && (
                    <div className="space-y-6 w-full">

                        {/* Official Handicap Card */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                            <h3 className="font-bold text-gray-900 text-[15pt] mb-2">Official Handicap (From Database)</h3>
                            <div className="text-[14pt] font-bold text-gray-800 mb-6">
                                Handicap Index: <span className="text-black text-[24pt]">{data.player.currentIndex.toFixed(1)}</span>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <p className="font-bold text-gray-700 mb-2 text-[14pt]">Course Handicap (City Park North, Par {data.courseData.par}):</p>
                                <div className="flex flex-col gap-2 items-center justify-center text-[14pt]">
                                    {data.courseData.tees
                                        .filter(t => ['White', 'Gold'].includes(t.name))
                                        .length === 0 ? (
                                        data.courseData.tees.slice(0, 2).map(t => (
                                            <TeeLine key={t.name} tee={t} index={data.player.currentIndex} par={data.courseData.par} />
                                        ))
                                    ) : (
                                        data.courseData.tees
                                            .filter(t => ['White', 'Gold'].includes(t.name))
                                            .map(t => (
                                                <TeeLine key={t.name} tee={t} index={data.player.currentIndex} par={data.courseData.par} />
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Scoring Record Header */}
                        <div className="px-1">
                            <h3 className="font-bold text-gray-900 text-[15pt]">Recent Scoring Record</h3>
                            <p className="text-sm text-gray-500 mt-1">Showing last 20 rounds (Best 8 count toward Index)</p>
                        </div>

                        {/* List - Only show last 20 for calculation verification */}
                        <div className="space-y-4">
                            {data.history.slice(0, 20).map((item) => (
                                <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 relative overflow-hidden">
                                    {/* Row 1: Date & Tee */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-900 text-[14pt]">
                                                {format(new Date(item.date), 'MMM d, yyyy')}
                                            </span>
                                            {/* Used Badge - Use usedForCurrent if available, fallback to historical used */}
                                            {item.usedForCurrent && (
                                                <span className="bg-green-600 text-white text-[12pt] font-bold px-2 py-0.5 rounded">USED</span>
                                            )}
                                        </div>
                                        {/* Diff */}
                                        <div className="text-right">
                                            <div className="font-black text-gray-900 text-[16pt] leading-none">
                                                Diff: {item.differential.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Details */}
                                    <div className="text-[14pt] text-gray-600 mb-4 flex flex-col gap-1">
                                        {item.gross ? (
                                            <div>
                                                <span className="font-medium text-gray-900">Grs: {item.gross}</span>
                                                <span className="text-gray-400 mx-1">-</span>
                                                <span className="text-gray-500">{calculateCourseHandicap(item.indexBefore, item.slope || 113, item.rating || 72, item.par || 72)}</span>
                                                <span className="text-gray-400 mx-1">=</span>
                                                <span className="font-black text-blue-600">Net: {item.gross - calculateCourseHandicap(item.indexBefore, item.slope || 113, item.rating || 72, item.par || 72)}</span>
                                                <span className="mx-2 text-gray-300">|</span>
                                                <span className={item.adjusted && item.adjusted !== item.gross ? "text-red-600 font-bold" : ""}>
                                                    Adj: {item.adjusted || item.gross}
                                                </span>
                                            </div>
                                        ) : (
                                            <div>Adjusted Gross Score (Historical)</div>
                                        )}
                                        {item.rating && (
                                            <div className="text-[13pt] text-gray-400">
                                                Par {item.par} • Rating {item.rating} • Slope {item.slope} • {item.teeColor || 'Est'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Row 3: Progression (Divider) */}
                                    <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-[14pt]">

                                        {/* Handicap (Est) */}
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-500">Hcp ({item.teeColor || 'Est'}):</span>
                                            <span className="font-mono text-gray-400 min-w-[50px] text-right">
                                                {calculateCourseHandicap(item.indexBefore, item.slope || 113, item.rating || 72, item.par || 72)}
                                                {' -> '}
                                                <span className={`font-bold ${calculateCourseHandicap(item.indexAfter, item.slope || 113, item.rating || 72, item.par || 72) >
                                                    calculateCourseHandicap(item.indexBefore, item.slope || 113, item.rating || 72, item.par || 72)
                                                    ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                    {calculateCourseHandicap(item.indexAfter, item.slope || 113, item.rating || 72, item.par || 72)}
                                                </span>
                                            </span>
                                        </div>

                                        {/* Index */}
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-500">Idx:</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-gray-400">{item.indexBefore.toFixed(1)}</span>
                                                <span className="text-gray-300">→</span>
                                                <span className={`font-bold ${item.indexAfter > item.indexBefore ? 'text-red-600' : 'text-green-600'
                                                    }`}>{item.indexAfter.toFixed(1)}</span>

                                                {item.isLowHi && (
                                                    <span className="ml-1 bg-blue-500 text-white text-[10pt] font-bold px-1.5 py-0.5 rounded">LOW HI</span>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
                }
            </div>
        </div>
    );
}

// Helpers
function calculateCourseHandicap(index: number, slope: number, rating: number, par: number) {
    // WHS: CH = Index * (Slope/113) + (CR - Par)
    const ch = index * (slope / 113) + (rating - par);
    return Math.round(ch);
}

function TeeLine({ tee, index, par }: { tee: { name: string, rating: number, slope: number }, index: number, par: number }) {
    const ch = calculateCourseHandicap(index, tee.slope, tee.rating, par);
    const displayName = tee.name;
    return (
        <div className="font-medium text-gray-600 text-[14pt]">
            <span className="text-black font-bold">{displayName}: {ch}</span>
            <span className="text-gray-400 ml-2">
                (Rating:{tee.rating} / Slope:{tee.slope})
            </span>
        </div>
    );
}


