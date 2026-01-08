'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Edit } from 'lucide-react';

type CourseData = {
    id: string;
    name: string;
    tee_boxes: { id: string; name: string; rating: number; slope: number }[];
    holes: { id: string; hole_number: number; par: number; difficulty: number | null }[];
};

export default function CourseViewModal({ course, isAdmin }: { course: CourseData; isAdmin: boolean }) {
    const router = useRouter();

    // Group holes by Front/Back
    const frontNine = course.holes.filter((h: any) => h.hole_number <= 9);
    const backNine = course.holes.filter((h: any) => h.hole_number > 9);

    const frontPar = frontNine.reduce((sum: number, h: any) => sum + h.par, 0);
    const backPar = backNine.reduce((sum: number, h: any) => sum + h.par, 0);
    const totalPar = frontPar + backPar;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-in fade-in">
            {/* Header */}
            <div className="bg-slate-50 border-b border-gray-100 px-1 py-4 flex justify-between items-center shrink-0">
                <div className="flex flex-col">
                    <h1 className="text-[18pt] font-black text-gray-900 tracking-tight text-left ml-3">{course.name}</h1>
                    <p className="text-[14pt] text-gray-500">Course Details</p>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Link
                            href={`/settings/course/${course.id}/edit`}
                            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95"
                        >
                            Edit
                        </Link>
                    )}
                    <button
                        onClick={() => router.push('/settings')}
                        className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-1 py-6 bg-slate-50">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Tee Boxes Summary */}
                    {course.tee_boxes.map((tee: any) => (
                        <div key={tee.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <h2 className="text-2xl font-bold border-b-2 border-gray-100 pb-2">
                                {tee.name} Tees
                            </h2>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 bg-gray-50 rounded-lg p-4 mb-4">
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Course Rating</div>
                                    <div className="text-xl font-bold">{tee.rating.toFixed(1)}</div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Slope Rating</div>
                                    <div className="text-xl font-bold">{Math.round(tee.slope)}</div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Total Par</div>
                                    <div className="text-xl font-bold">{totalPar}</div>
                                </div>
                            </div>

                            {/* Scorecard Table - Front 9 */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Front Nine</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-center text-sm">
                                        <thead className="bg-gray-100 font-bold text-gray-700">
                                            <tr>
                                                <th className="py-2 w-24 text-left pl-1">Hole</th>
                                                {frontNine.map((h: any) => <th key={h.id} className="py-2 border-l border-gray-200">{h.hole_number}</th>)}
                                                <th className="py-2 border-l border-gray-200 bg-gray-200">OUT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            <tr>
                                                <td className="py-3 font-bold text-left pl-1">Par</td>
                                                {frontNine.map((h: any) => <td key={h.id} className="py-3 border-l border-gray-200">{h.par}</td>)}
                                                <td className="py-3 border-l border-gray-200 font-bold bg-gray-50">{frontPar}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 font-bold text-left pl-1 text-gray-500">Hardness</td>
                                                {frontNine.map((h: any) => <td key={h.id} className="py-3 border-l border-gray-200 text-gray-500">{h.difficulty ?? '-'}</td>)}
                                                <td className="py-3 border-l border-gray-200 bg-gray-50">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Scorecard Table - Back 9 */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Back Nine</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-center text-sm">
                                        <thead className="bg-gray-100 font-bold text-gray-700">
                                            <tr>
                                                <th className="py-2 w-24 text-left pl-1">Hole</th>
                                                {backNine.map((h: any) => <th key={h.id} className="py-2 border-l border-gray-200">{h.hole_number}</th>)}
                                                <th className="py-2 border-l border-gray-200 bg-gray-200">IN</th>
                                                <th className="py-2 border-l border-gray-200 bg-gray-300">TOT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            <tr>
                                                <td className="py-3 font-bold text-left pl-1">Par</td>
                                                {backNine.map((h: any) => <td key={h.id} className="py-3 border-l border-gray-200">{h.par}</td>)}
                                                <td className="py-3 border-l border-gray-200 font-bold bg-gray-50">{backPar}</td>
                                                <td className="py-3 border-l border-gray-200 font-bold bg-gray-100">{totalPar}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 font-bold text-left pl-1 text-gray-500">Hardness</td>
                                                {backNine.map((h: any) => <td key={h.id} className="py-3 border-l border-gray-200 text-gray-500">{h.difficulty ?? '-'}</td>)}
                                                <td className="py-3 border-l border-gray-200 bg-gray-50">-</td>
                                                <td className="py-3 border-l border-gray-200 bg-gray-100">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}

                    {course.tee_boxes.length === 0 && <p className="text-gray-500 text-center">No tee boxes defined.</p>}
                </div>
            </div>
        </div>
    );
}
