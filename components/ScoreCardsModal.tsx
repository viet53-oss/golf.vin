'use client';

import { useState } from 'react';

interface Hole {
    hole_number: number;
    par: number;
    difficulty?: number | null;
}

interface Score {
    strokes: number;
    hole: {
        hole_number: number;
        difficulty?: number | null;
    };
}

interface RoundPlayer {
    id: string;
    player: {
        name: string;
    };
    gross_score: number;
    scores: Score[];
    index_at_time: number;
    tee_box: {
        name: string;
        rating: number;
        slope: number;
    };
}

interface ScoreCardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    roundPlayers: RoundPlayer[];
    holes: Hole[];
    coursePar: number;
}

export default function ScoreCardsModal({ isOpen, onClose, roundPlayers, holes, coursePar }: ScoreCardsModalProps) {
    if (!isOpen) return null;

    const splitName = (fullName: string) => {
        const parts = fullName.trim().split(' ');
        if (parts.length === 1) return { first: parts[0], last: '' };
        const last = parts[parts.length - 1];
        const first = parts.slice(0, -1).join(' ');
        return { first, last };
    };

    // Calculate rankings based on net score
    const rankedPlayers = roundPlayers.map(player => {
        const playerScores = player.scores || [];
        let totalGross = 0;
        let strokesReceivedSoFar = 0;
        let parTotal = 0;
        let thru = 0;

        const slope = player.tee_box?.slope || 113;
        const rating = player.tee_box?.rating || coursePar;
        const index = player.index_at_time || 0;
        const courseHcp = Math.round(index * (slope / 113) + (rating - coursePar));

        const grossHoleScores: { difficulty: number; grossScore: number }[] = [];

        playerScores.forEach((score) => {
            totalGross += score.strokes;
            const hole = holes.find(h => h.hole_number === score.hole.hole_number);
            const holePar = hole?.par || 4;
            const difficulty = hole?.difficulty || score.hole.hole_number;

            grossHoleScores.push({
                difficulty,
                grossScore: score.strokes
            });

            let holeStrokes = 0;
            if (courseHcp > 0) {
                const base = Math.floor(courseHcp / 18);
                const remainder = courseHcp % 18;
                holeStrokes = base + (difficulty <= remainder ? 1 : 0);
            }
            strokesReceivedSoFar += holeStrokes;

            parTotal += holePar;
            thru++;
        });

        grossHoleScores.sort((a, b) => a.difficulty - b.difficulty);

        const totalNet = totalGross - strokesReceivedSoFar;
        const toPar = totalGross - parTotal;

        return { ...player, totalGross, strokesReceivedSoFar, courseHcp, totalNet, thru, toPar, parTotal, grossHoleScores };
    }).sort((a, b) => {
        if (a.totalNet !== b.totalNet) return a.totalNet - b.totalNet;
        const len = Math.min(a.grossHoleScores.length, b.grossHoleScores.length);
        for (let i = 0; i < len; i++) {
            if (a.grossHoleScores[i].grossScore !== b.grossHoleScores[i].grossScore) {
                return a.grossHoleScores[i].grossScore - b.grossHoleScores[i].grossScore;
            }
        }
        return 0;
    });

    const allPlayersFinished = rankedPlayers.length > 0 && rankedPlayers.every(p => p.thru >= 18);

    return (
        <div className="fixed inset-0 z-[300] bg-gray-50 overflow-y-auto">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10 px-1 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h1 className="text-[18pt] font-bold text-gray-900 tracking-tight text-left ml-3">ScoreCards</h1>
                    <button
                        onClick={onClose}
                        className="px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors mr-3"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* ScoreCards */}
            <div className="p-1 space-y-1 mt-2">
                {rankedPlayers.map((p, i) => {
                    let toParStr = "E";
                    let toParClass = "text-green-600";
                    if (p.toPar > 0) {
                        toParStr = `+${p.toPar}`;
                        toParClass = "text-gray-900";
                    } else if (p.toPar < 0) {
                        toParStr = `${p.toPar}`;
                        toParClass = "text-red-600";
                    }

                    let displayRankInSummary: React.ReactNode = i + 1;
                    let showFlagInSummary = false;
                    let showRankIconInSummary: React.ReactNode = null;

                    if (p.thru >= 18) {
                        if (allPlayersFinished) {
                            if (i === 0) {
                                displayRankInSummary = "🏆";
                                showRankIconInSummary = "🏆";
                            } else if (i === 1) {
                                displayRankInSummary = "🥈";
                                showRankIconInSummary = "🥈";
                            } else if (i === 2) {
                                displayRankInSummary = "🥉";
                                showRankIconInSummary = "🥉";
                            } else {
                                showFlagInSummary = true;
                            }
                        } else {
                            showFlagInSummary = true;
                        }
                    }

                    return (
                        <div key={p.id} className="bg-white shadow-lg rounded-xl overflow-hidden my-1 border-4 border-gray-300">
                            {/* Player Header */}
                            <div className="bg-[#1d4ed8] p-1 text-white">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <div className="font-bold text-[15pt] leading-tight">{splitName(p.player.name).first}</div>
                                            <div className="text-[12pt] leading-tight opacity-90">{splitName(p.player.name).last}</div>
                                        </div>
                                        <div className="flex items-center">
                                            {showRankIconInSummary && <span className="text-[20pt] leading-none">{showRankIconInSummary}</span>}
                                            {showFlagInSummary && <span className="text-[20pt] leading-none">🏁</span>}
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-center">
                                        <div className={`bg-white font-bold rounded px-2 h-8 flex items-center justify-center text-[15pt] min-w-[3rem] ${toParClass}`}>
                                            {toParStr}
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[15pt] opacity-80 font-bold tracking-wider">GRS</div>
                                            <div className="text-[15pt] font-bold leading-none">{p.totalGross}</div>
                                        </div>
                                        <div>
                                            <div className="text-[15pt] opacity-80 font-bold tracking-wider">HCP</div>
                                            <div className="text-[15pt] font-bold leading-none">{p.strokesReceivedSoFar}/{p.courseHcp}</div>
                                        </div>
                                        <div>
                                            <div className="text-[15pt] opacity-80 font-bold tracking-wider">NET</div>
                                            <div className="text-[15pt] font-bold leading-none">{p.totalNet}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Score Grid */}
                            <div className="p-1 border border-black rounded shadow-sm overflow-hidden">
                                {/* Row 1: Holes 1-9 */}
                                <div className="grid grid-cols-9 border-b border-black">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                        const scoreObj = p.scores.find(s => Number(s.hole.hole_number) === num);
                                        const score = scoreObj?.strokes || null;
                                        const hole = holes.find(h => Number(h.hole_number) === num);
                                        const holePar = hole?.par || 4;

                                        let bgClass = "bg-white";
                                        if (score !== null) {
                                            const diff = score - holePar;
                                            if (diff <= -2) bgClass = "bg-yellow-300"; // Eagle: Darker Yellow
                                            else if (diff === -1) bgClass = "bg-green-300"; // Birdie: Darker Green
                                            else if (diff === 0) bgClass = "bg-white"; // Par: Pure White
                                            else if (diff === 1) bgClass = "bg-orange-200"; // Bogey: Darker Orange
                                            else if (diff >= 2) bgClass = "bg-red-300"; // Double Bogey+: Darker Red
                                        }

                                        return (
                                            <div key={num} className="flex flex-col items-center justify-center h-16 border-r border-black last:border-r-0 relative bg-white">
                                                <div className="absolute top-1 inset-x-0 text-center text-[10pt] text-gray-500">
                                                    <span className="font-bold text-gray-900">{num}</span>/{holePar}
                                                </div>
                                                <div className={`text-[15pt] font-bold px-2 py-0.5 rounded mt-5 ${bgClass} ${score !== null ? 'text-gray-900' : 'text-transparent'}`}>
                                                    {score || '-'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Row 2: Holes 10-18 */}
                                <div className="grid grid-cols-9">
                                    {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => {
                                        const scoreObj = p.scores.find(s => Number(s.hole.hole_number) === num);
                                        const score = scoreObj?.strokes || null;
                                        const hole = holes.find(h => Number(h.hole_number) === num);
                                        const holePar = hole?.par || 4;

                                        let bgClass = "bg-white";
                                        if (score !== null) {
                                            const diff = score - holePar;
                                            if (diff <= -2) bgClass = "bg-yellow-300"; // Eagle: Darker Yellow
                                            else if (diff === -1) bgClass = "bg-green-300"; // Birdie: Darker Green
                                            else if (diff === 0) bgClass = "bg-white"; // Par: Pure White
                                            else if (diff === 1) bgClass = "bg-orange-200"; // Bogey: Darker Orange
                                            else if (diff >= 2) bgClass = "bg-red-300"; // Double Bogey+: Darker Red
                                        }

                                        return (
                                            <div key={num} className="flex flex-col items-center justify-center h-16 border-r border-black last:border-r-0 relative bg-white">
                                                <div className="absolute top-1 inset-x-0 text-center text-[10pt] text-gray-500">
                                                    <span className="font-bold text-gray-900">{num}</span>/{holePar}
                                                </div>
                                                <div className={`text-[15pt] font-bold px-2 py-0.5 rounded mt-5 ${bgClass} ${score !== null ? 'text-gray-900' : 'text-transparent'}`}>
                                                    {score || '-'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Score Legend */}
            <div className="bg-white rounded-xl shadow-lg p-1 m-1 flex flex-wrap gap-1 items-center justify-center text-[15pt]">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-300"></div>Eagle (-2)</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-300"></div>Birdie (-1)</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>Par (E)</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-200"></div>Bogey (+1)</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-300"></div>Double+ (+2)</div>
            </div>
        </div>
    );
}
