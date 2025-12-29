'use client';

import { useState } from 'react';
import RulesModal from '@/components/RulesModal';

export default function AppLogicButton() {
    const [modalOpen, setModalOpen] = useState(false);

    const appLogicContent = (
        <div className="space-y-12 text-gray-700 text-[14pt]">
            {/* Tie Breaker Section */}
            <section>
                <h3 className="text-[14pt] font-bold text-blue-800 mb-6 border-b border-blue-100 pb-2">
                    🏆 Tie Breaker Rules
                </h3>
                <div className="space-y-6 pl-1">
                    <p className="leading-relaxed text-[14pt]">
                        When players have the same Net Score, we use a <span className="font-bold text-gray-900">"Hardest Hole" card-off</span> to determine the winner.
                    </p>
                    <ol className="list-decimal pl-8 space-y-4 marker:font-bold marker:text-blue-600 text-[14pt]">
                        <li>
                            <span className="font-bold text-gray-900">Step 1:</span> We compare the Net Score on the <span className="font-bold text-red-600">#1 Hardest Hole</span> (Stroke Index 1). Lower score wins.
                        </li>
                        <li>
                            <span className="font-bold text-gray-900">Step 2:</span> If tied on the #1 hole, we move to the <span className="font-bold text-red-600">#2 Hardest Hole</span>, and so on.
                        </li>
                        <li>
                            <span className="font-bold text-gray-900">Why?</span> This rewards performance on the most difficult parts of the course.
                        </li>
                    </ol>
                    <div className="bg-blue-50 p-6 rounded-xl mt-4 text-[14pt] border-l-8 border-blue-500">
                        <strong className="block text-[14pt] mb-2">Example:</strong>
                        Tom and Charlie both shoot Net 71.<br />
                        - Hole #18 is Rank 1 (Hardest). Both make Net 5. (Still Tied)<br />
                        - Hole #9 is Rank 2. Tom makes 5, Charlie makes 6.<br />
                        ✅ <strong className="text-[14pt] text-blue-900">Tom Wins</strong> the tie-breaker.
                    </div>

                    <div className="space-y-6 pt-6">
                        <div className="bg-emerald-50 border-l-8 border-emerald-500 p-6 rounded-xl shadow-sm">
                            <p className="font-black text-emerald-900 text-[14pt] mb-2 uppercase tracking-tight">Pool Front 9 Category</p>
                            <p className="text-[14pt] text-emerald-800 leading-relaxed mb-2">Compare net scores starting from the <span className="font-bold underline text-emerald-900">hardest handicap hole on the front nine only</span> (holes 1-9) and work backwards through front nine holes until a lower score is found.</p>
                            <p className="text-[14pt] text-emerald-700 italic font-bold">Example: If hole #9 is the hardest on front 9, compare #9 first, then the next hardest front 9 hole, etc.</p>
                        </div>
                        <div className="bg-indigo-50 border-l-8 border-indigo-500 p-6 rounded-xl shadow-sm">
                            <p className="font-black text-indigo-900 text-[14pt] mb-2 uppercase tracking-tight">Pool Back 9 Category</p>
                            <p className="text-[14pt] text-indigo-800 leading-relaxed mb-2">Compare net scores starting from the <span className="font-bold underline text-indigo-900">hardest handicap hole on the back nine only</span> (holes 10-18) and work backwards through back nine holes until a lower score is found.</p>
                            <p className="text-[14pt] text-indigo-700 italic font-bold">Example: If hole #11 is the hardest on back 9, compare #11 first, then the next hardest back 9 hole, etc.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Handicap Section */}
            <section>
                <h3 className="text-[14pt] font-bold text-green-800 mb-6 border-b border-green-100 pb-2">
                    ⛳ Handicap & Hardness
                </h3>
                <div className="space-y-6 pl-1">
                    <p className="text-[14pt]">
                        <strong>Course Handicap (CH):</strong> Calculated using your Index, the Tee Slope, and Rating.
                    </p>
                    <code className="block bg-gray-100 p-4 rounded-xl text-[14pt] font-mono text-center font-bold">
                        CH = (Index * Slope / 113) + (Rating - Par)
                    </code>
                    <p className="mt-4 text-[14pt]">
                        <strong>Stroke Allocation (Dots):</strong> Strokes are assigned to holes based on the hole's <strong>Difficulty Rank</strong> (1-18).
                    </p>
                    <ul className="list-disc pl-8 space-y-3 text-[14pt]">
                        <li>If you are an <strong>11 Handicap</strong>, you get 1 stroke on the 11 hardest holes (Ranks 1-11).</li>
                        <li>If you are a <strong>20 Handicap</strong>, you get 1 stroke on every hole, PLUS an extra stroke on Ranks 1-2 (Total 2 strokes on hardest holes).</li>
                    </ul>
                </div>
            </section>

            {/* Pool Logic Section */}
            <section>
                <h3 className="text-[14pt] font-bold text-amber-800 mb-6 border-b border-amber-100 pb-2">
                    💰 The $5 Pool
                </h3>
                <div className="space-y-6 pl-1">
                    <p className="text-[14pt]">
                        Everyone contributes <strong>$5.00</strong> to the pot. Each Flight's pot is split three ways:
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-green-50 p-5 rounded-xl border-2 border-green-200">
                            <div className="text-[14pt] font-black text-green-700">40%</div>
                            <div className="text-[14pt] font-bold uppercase text-green-800">Front 9 Winner</div>
                        </div>
                        <div className="bg-green-50 p-5 rounded-xl border-2 border-green-200">
                            <div className="text-[14pt] font-black text-green-700">40%</div>
                            <div className="text-[14pt] font-bold uppercase text-green-800">Back 9 Winner</div>
                        </div>
                        <div className="bg-green-50 p-5 rounded-xl border-2 border-green-200">
                            <div className="text-[14pt] font-black text-green-700">20%</div>
                            <div className="text-[14pt] font-bold uppercase text-green-800">Total Net Winner</div>
                        </div>
                    </div>
                    <p className="text-[14pt] text-gray-500 italic font-medium">
                        *Winners are determined by lowest Net Score, using the Tie Breaker rules above.
                    </p>
                </div>
            </section>

            {/* Points & YTD Section */}
            <section>
                <h3 className="text-[14pt] font-bold text-purple-800 mb-6 border-b border-purple-100 pb-2">
                    📈 Points & YTD
                </h3>
                <div className="space-y-6 pl-1">
                    <p className="text-[14pt]">
                        <strong>Tournament Points</strong> are awarded based on your Net Score finish in your Flight:
                    </p>
                    <ul className="list-none space-y-4 text-[14pt]">
                        <li className="flex items-center gap-4">
                            <span className="bg-yellow-100 text-yellow-700 font-bold px-1 py-1.5 rounded-lg w-20 text-center">1st</span>
                            <span className="font-bold">100 Points</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <span className="bg-gray-100 text-gray-700 font-bold px-1 py-1.5 rounded-lg w-20 text-center">2nd</span>
                            <span className="font-bold">75 Points</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <span className="bg-orange-100 text-orange-700 font-bold px-1 py-1.5 rounded-lg w-20 text-center">3rd</span>
                            <span className="font-bold">50 Points</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <span className="bg-slate-100 text-slate-700 font-bold px-1 py-1.5 rounded-lg w-20 text-center">Others</span>
                            <span className="font-bold">20 Points</span>
                        </li>
                    </ul>
                    <p className="mt-6 text-[14pt]">
                        <strong>YTD (Year to Date):</strong> The sum of all points earned in tournaments throughout the current year.
                    </p>
                </div>
            </section>

            {/* WHS Calculations & Caps Section */}
            <section className="pt-8 border-t-2 border-gray-100 space-y-8">
                <h3 className="text-[14pt] font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">
                    📐 WHS Calculations & Caps
                </h3>

                {/* Differential & Index Calc */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-lg border-l-8 border-green-500">
                        <p className="text-[14pt] font-black text-gray-400 uppercase mb-2 tracking-widest">Score Differential</p>
                        <p className="text-[14pt] font-mono text-green-400 italic mb-3 leading-tight">(Adj Gross - Rating) × 113 / Slope</p>
                        <p className="text-[14pt] text-gray-300 leading-tight">Ex (White): (85 - 63.8) × 113 / 100 = <span className="text-white font-bold underline">23.96 → 24.0 Diff</span></p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <p className="bg-gray-50 px-1 py-4 font-black text-lg text-gray-500 uppercase tracking-widest border-b border-gray-100">Handicap Index Calculation</p>
                        <table className="w-full text-lg font-bold">
                            <thead className="bg-gray-50/50 text-gray-400">
                                <tr>
                                    <th className="px-1 py-3 text-left">Rounds Played</th>
                                    <th className="px-1 py-3 text-right">Best Differentials Used</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-gray-600">
                                <tr><td className="px-1 py-2 ">3 - 5</td><td className="px-1 py-2 text-right text-green-600">Lowest 1</td></tr>
                                <tr><td className="px-1 py-2 ">6 - 8</td><td className="px-1 py-2 text-right text-green-600">Lowest 2</td></tr>
                                <tr><td className="px-1 py-2 ">9 - 10</td><td className="px-1 py-2 text-right text-green-600">Lowest 3</td></tr>
                                <tr><td className="px-1 py-2 ">11 - 12</td><td className="px-1 py-2 text-right text-green-600">Lowest 4</td></tr>
                                <tr><td className="px-1 py-2 ">13 - 14</td><td className="px-1 py-2 text-right text-green-600">Lowest 5</td></tr>
                                <tr><td className="px-1 py-2 ">15 - 16</td><td className="px-1 py-2 text-right text-green-600">Lowest 6</td></tr>
                                <tr><td className="px-1 py-2 ">17 - 18</td><td className="px-1 py-2 text-right text-green-600">Lowest 7</td></tr>
                                <tr className="bg-gray-50 font-black text-gray-900 border-l-8 border-black"><td className="px-1 py-3">19 - 20+</td><td className="px-1 py-3 text-right text-black">Lowest 8</td></tr>
                            </tbody>
                        </table>
                        <p className="p-4 text-center text-xl font-black italic bg-gray-900 text-white shadow-inner underline decoration-green-500 underline-offset-4">Index = Average of Best 8 Differentials</p>
                    </div>
                </div>

                {/* Caps */}
                <div className="space-y-4">
                    <h4 className="font-black text-gray-900 text-2xl uppercase">Caps & Protections</h4>

                    <div className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                        <p className="font-black text-lg mb-2 uppercase text-red-600">NET DOUBLE BOGEY (Adjusted Gross)</p>
                        <p className="text-xl text-gray-500 mb-3 italic">Max Score = Par + 2 + Handicap Strokes on That Hole</p>
                        <div className="space-y-2 text-lg text-gray-600 leading-tight">
                            <p>• Hole #1 (Par 4, strokes 1): 4 + 2 + 1 = <span className="font-bold underline">7 Max</span></p>
                            <p>• Hole #2 (Par 4, strokes 0): 4 + 2 + 0 = <span className="font-bold underline">6 Max</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm space-y-4">
                            <div className="flex justify-between items-center"><p className="font-black text-xl uppercase">Soft Cap</p> <span className="bg-green-100 text-green-700 px-1 py-1 rounded-lg text-xs font-black tracking-tighter">50% REDUCTION</span></div>
                            <p className="text-lg text-gray-500">If Index increases &gt; 3.0 above Low Index, the excess is reduced by 50%.</p>
                        </div>
                        <div className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm space-y-4">
                            <div className="flex justify-between items-center"><p className="font-black text-xl uppercase">Hard Cap</p> <span className="bg-red-100 text-red-700 px-1 py-1 rounded-lg text-xs font-black tracking-tighter">MAX +5.0</span></div>
                            <p className="text-lg text-gray-500">Index CANNOT increase &gt; 5.0 above Low Index within 12 months.</p>
                        </div>
                    </div>

                    <div className="bg-black text-white p-6 rounded-xl border border-green-500/30 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="font-black text-xl text-green-400">ESR (EXCEPTIONAL SCORE)</p>
                            <span className="bg-green-500 text-black px-1 py-1 rounded-lg text-xs font-black uppercase tracking-tighter">-1.0 REDUCTION</span>
                        </div>
                        <p className="text-lg text-gray-400 italic">Trigger: Round is 7.0+ strokes better than Index.</p>
                    </div>
                </div>
            </section>
        </div>
    );

    return (
        <>
            <button
                onClick={() => setModalOpen(true)}
                className="w-full bg-blue-900 text-white py-2 px-1 rounded-full font-black text-[14pt] shadow-lg hover:bg-blue-800 transition-all active:scale-95 border-b-2 border-blue-600 flex items-center justify-center gap-2"
            >
                <span className="text-xl">📘</span> App Logic & Rules
            </button>

            <RulesModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="App Logic & Rules"
                content={appLogicContent}
            />
        </>
    );
}
