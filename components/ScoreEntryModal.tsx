'use client';

import { useState, useEffect } from 'react';

// Native SVG icon
const CloseIcon = ({ size = 24 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
);

type Hole = {
    id: string;
    hole_number: number;
    par: number;
    difficulty: number | null;
};

type ScoreModalProps = {
    isOpen: boolean;
    onClose: () => void;
    playerName: string;
    courseId: string;
    roundPlayerId: string;
    currentGross: number | null;
    currentFront: number | null;
    currentBack: number | null;
    currentPoints?: number;
    currentPayout?: number;
    playerIndex?: number;
    indexAtTime?: number | null;
    teeBox?: { name: string; slope: number; rating: number } | null;
    coursePar?: number;
    onSave: (grossScore: number, frontNine: number, backNine: number, points: number, payout: number, holeScores: { holeId: string, strokes: number }[]) => Promise<void>;
};

// Helper component extracted to prevent re-creation on render
const NineHoleSection = ({
    title,
    holes,
    totalLabel,
    totalPar,
    totalScore,
    startIdx,
    scores,
    updateScore,
    getScoreClass
}: {
    title: string;
    holes: Hole[];
    totalLabel: string;
    totalPar: number;
    totalScore: number;
    startIdx: number;
    scores: number[];
    updateScore: (idx: number, val: string) => void;
    getScoreClass: (s: number, p: number) => string;
}) => (
    <div className="mb-6">
        <h4 className="font-bold text-black mb-2 px-1">{title}</h4>
        <div className="flex bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm">
            {/* Scrollable Hole Data */}
            <div className="flex-1 overflow-x-auto no-scrollbar">
                <table className="w-full text-center border-collapse min-w-[300px]">
                    <tbody>
                        {/* Header Row (Hole #) */}
                        <tr className="border-b border-gray-100">
                            <td className="px-3 py-2 text-[16pt] font-bold text-gray-400 uppercase text-left w-16">Hole</td>
                            {holes.map(h => (
                                <td key={h.id} className="px-3 py-2 w-10 font-bold text-[16pt] text-black">{h.hole_number}</td>
                            ))}
                        </tr>
                        {/* Par Row */}
                        <tr className="border-b border-gray-100">
                            <td className="px-3 py-2 text-[16pt] font-bold text-gray-400 uppercase text-left">Par</td>
                            {holes.map(h => (
                                <td key={h.id} className="px-3 py-2 w-10 text-[16pt] text-gray-500">{h.par}</td>
                            ))}
                        </tr>
                        {/* Score Row */}
                        <tr className="border-b border-gray-100">
                            <td className="px-3 py-2 text-[16pt] font-bold text-black uppercase text-left">Score</td>
                            {holes.map((h, idx) => {
                                const scoreIdx = startIdx + idx;
                                const score = scores[scoreIdx];
                                return (
                                    <td key={h.id} className={`p-1 w-10 font-black text-[16pt] ${getScoreClass(score, h.par)}`}>
                                        <input
                                            id={`hole-input-${scoreIdx}`}
                                            type="number"
                                            min="0"
                                            max="15"
                                            value={score || ''}
                                            onChange={(e) => updateScore(scoreIdx, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    // console.log('Enter pressed at index:', scoreIdx);
                                                    const nextId = `hole-input-${scoreIdx + 1}`;
                                                    const nextInput = document.getElementById(nextId);
                                                    if (nextInput) {
                                                        (nextInput as HTMLInputElement).focus();
                                                        (nextInput as HTMLInputElement).select();
                                                    } else {
                                                        (e.target as HTMLInputElement).blur();
                                                    }
                                                }
                                            }}
                                            className="w-full h-full text-center bg-transparent border-none outline-none font-black text-[16pt] focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-50 rounded-md caret-black"
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                        {/* Hardness Row */}
                        <tr>
                            <td className="px-3 py-2 text-[16pt] font-bold text-gray-400 uppercase text-left">Hardness</td>
                            {holes.map(h => (
                                <td key={h.id} className="px-3 py-2 w-10 text-[16pt] text-gray-400">{h.difficulty || '-'}</td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Fixed Total Column */}
            <div className="w-20 bg-gray-100 border-l border-gray-200 flex flex-col justify-center items-center shrink-0">
                <span className="text-[16pt] font-bold text-gray-500 uppercase mb-1">{totalLabel}</span>
                <span className="text-xl font-black text-black">{totalScore || '-'}</span>
                <span className="text-[16pt] text-gray-400 mt-1">Par {totalPar}</span>
            </div>
        </div>
    </div>
);

export default function ScoreEntryModal({
    isOpen,
    onClose,
    playerName,
    courseId,
    roundPlayerId,
    currentGross,
    currentFront,
    currentBack,
    currentPoints,
    currentPayout,
    playerIndex,
    indexAtTime,
    teeBox,
    coursePar,
    onSave
}: ScoreModalProps) {
    const [holes, setHoles] = useState<Hole[]>([]);
    const [scores, setScores] = useState<number[]>(Array(18).fill(0));
    const [points, setPoints] = useState<number>(currentPoints || 0);
    const [payout, setPayout] = useState<number>(currentPayout || 0);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch hole data & existing scores when modal opens
    useEffect(() => {
        if (isOpen && courseId) {
            setIsLoading(true);

            // Reset points/payout from props
            setPoints(currentPoints || 0);
            setPayout(currentPayout || 0);

            Promise.all([
                fetch(`/api/holes?courseId=${courseId}`).then(res => res.json()),
                fetch(`/api/round-player/${roundPlayerId}/scores`).then(res => res.json())
            ])
                .then(([holeData, existingScores]) => {
                    console.log('Loaded holes:', holeData);
                    console.log('Loaded existing scores:', existingScores);
                    setHoles(holeData);

                    // If we have existing scores, map them to our scores array
                    if (Array.isArray(existingScores) && existingScores.length > 0) {
                        const newScores = Array(18).fill(0);
                        existingScores.forEach((s: any) => {
                            // Find which hole index this is (0-17)
                            const holeIndex = holeData.findIndex((h: any) => h.id === s.hole_id);
                            if (holeIndex !== -1) {
                                newScores[holeIndex] = s.strokes;
                            }
                        });
                        setScores(newScores);
                        console.log('Mapped scores:', newScores);
                    } else {
                        console.log('No existing scores found');
                    }

                    setIsLoading(false);
                })
                .catch(err => {
                    console.error('Failed to load scorecard detail:', err);
                    setIsLoading(false);
                });
        }
    }, [isOpen, courseId, roundPlayerId, currentPoints, currentPayout]);

    if (!isOpen) return null;

    const frontNineHoles = holes.filter(h => h.hole_number <= 9).sort((a, b) => a.hole_number - b.hole_number);
    const backNineHoles = holes.filter(h => h.hole_number > 9).sort((a, b) => a.hole_number - b.hole_number);

    const frontScores = scores.slice(0, 9);
    const backScores = scores.slice(9, 18);

    const frontTotal = frontScores.reduce((a, b) => a + b, 0);
    const backTotal = backScores.reduce((a, b) => a + b, 0);
    const grossTotal = frontTotal + backTotal;

    const frontPar = frontNineHoles.reduce((sum, h) => sum + h.par, 0);
    const backPar = backNineHoles.reduce((sum, h) => sum + h.par, 0);
    const totalPar = frontPar + backPar;

    // Calculate Course Handicap and Net Score
    const playerIdx = indexAtTime ?? playerIndex ?? 0;
    const slope = teeBox?.slope ?? 113;
    const rating = teeBox?.rating ?? 72;
    const par = coursePar ?? totalPar;
    const courseHcp = Math.round(playerIdx * (slope / 113) + (rating - par));
    const netScore = grossTotal > 0 ? grossTotal - courseHcp : 0;


    const getScoreClass = (score: number, par: number) => {
        if (score === 0) return 'bg-transparent text-black';
        const diff = score - par;
        if (diff <= -2) return 'bg-blue-200 text-blue-900'; // Eagle+
        if (diff === -1) return 'bg-emerald-200 text-emerald-900'; // Birdie
        if (diff === 0) return 'bg-white text-black'; // Par
        if (diff === 1) return 'bg-amber-100 text-amber-900'; // Bogey
        return 'bg-rose-200 text-rose-900'; // Double+
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const holeScores = holes.map((h, idx) => ({
                holeId: h.id,
                strokes: scores[idx] || 0
            }));
            await onSave(grossTotal, frontTotal, backTotal, points, payout, holeScores);
            onClose();
        } catch (error) {
            console.error('Failed to save score:', error);
            alert('Failed to save score');
        } finally {
            setIsSaving(false);
        }
    };

    const updateScore = (holeIndex: number, value: string) => {
        const numValue = parseInt(value) || 0;
        const newScores = [...scores];
        newScores[holeIndex] = numValue;
        setScores(newScores);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header Actions */}
                <div className="flex justify-between items-center p-3 bg-white border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Scorecard</span>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                        <CloseIcon size={20} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center text-gray-500">Loading course data...</div>
                ) : holes.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-500 font-medium">No hole data found for this course.</p>
                        <p className="text-sm text-gray-400 mt-2">Please add hole information in the database first.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto p-3 pb-8 bg-slate-50">

                        {/* Header Title */}
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-black text-black tracking-tight">{playerName}</h2>
                        </div>

                        {/* Big Stats Row */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-8 flex justify-around items-center text-center">
                            <div>
                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Gross</span>
                                <span className="text-3xl sm:text-4xl font-black text-black">{grossTotal || '-'}</span>
                            </div>
                            <div className="w-px h-10 bg-gray-100 mx-2"></div>
                            <div>
                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Hcp</span>
                                <span className="text-3xl sm:text-4xl font-black text-black">{courseHcp}</span>
                            </div>
                            <div className="w-px h-10 bg-gray-100 mx-2"></div>
                            <div>
                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Net</span>
                                <span className="text-3xl sm:text-4xl font-black text-black">{netScore || '-'}</span>
                            </div>
                        </div>

                        {/* Front 9 */}
                        <NineHoleSection
                            title="Front 9"
                            holes={frontNineHoles}
                            totalLabel="OUT"
                            totalPar={frontPar}
                            totalScore={frontTotal}
                            startIdx={0}
                            scores={scores}
                            updateScore={updateScore}
                            getScoreClass={getScoreClass}
                        />

                        {/* Back 9 */}
                        <NineHoleSection
                            title="Back 9"
                            holes={backNineHoles}
                            totalLabel="IN"
                            totalPar={backPar}
                            totalScore={backTotal}
                            startIdx={9}
                            scores={scores}
                            updateScore={updateScore}
                            getScoreClass={getScoreClass}
                        />

                        {/* Legend */}
                        <div className="flex flex-wrap justify-center gap-3 mt-8">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-blue-200 border border-blue-300 rounded-sm"></span>
                                <span className="text-[16pt] font-bold text-gray-500 uppercase">Eagle+</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-emerald-200 border border-emerald-300 rounded-sm"></span>
                                <span className="text-[16pt] font-bold text-gray-500 uppercase">Birdie</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-white border border-gray-200 rounded-sm"></span>
                                <span className="text-[16pt] font-bold text-gray-500 uppercase">Par</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded-sm"></span>
                                <span className="text-[16pt] font-bold text-gray-500 uppercase">Bogey</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-rose-200 border border-rose-300 rounded-sm"></span>
                                <span className="text-[16pt] font-bold text-gray-500 uppercase">Double+</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || grossTotal === 0}
                                className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {isSaving ? 'Saving...' : 'Save Score'}
                            </button>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
