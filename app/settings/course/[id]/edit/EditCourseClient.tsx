'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { updateCourse } from '@/app/actions/update-course';

// Types matching Prisma include
type CourseData = {
    id: string;
    name: string;
    tee_boxes: { id: string; name: string; rating: number; slope: number }[];
    holes: { id: string; hole_number: number; par: number; difficulty: number | null }[];
};

export default function EditCourseClient({ initialCourse }: { initialCourse: CourseData }) {
    const [name, setName] = useState(initialCourse.name);
    const [tees, setTees] = useState(initialCourse.tee_boxes);
    const [holes, setHoles] = useState(initialCourse.holes); // Should be sorted 1-18
    const [isPending, startTransition] = useTransition();

    // Ensure we have exactly 18 holes state even if DB has gaps (unlikely but safe)
    // Actually we will just respect DB state for simplicity unless create mode.

    const handleHoleChange = (index: number, field: 'par' | 'difficulty', value: string) => {
        const numVal = parseInt(value) || 0;
        const newHoles = [...holes];
        if (field === 'par') newHoles[index] = { ...newHoles[index], par: numVal };
        else newHoles[index] = { ...newHoles[index], difficulty: numVal };
        setHoles(newHoles);
    };

    const handleTeeChange = (index: number, field: 'name' | 'rating' | 'slope', value: string) => {
        const newTees = [...tees];
        if (field === 'name') newTees[index] = { ...newTees[index], name: value };
        else newTees[index] = { ...newTees[index], [field]: parseFloat(value) || 0 };
        setTees(newTees);
    };

    const handleSubmit = () => {
        startTransition(async () => {
            await updateCourse(initialCourse.id, {
                name,
                tees,
                holes
            });
        });
    };

    // Split holes for UI
    const frontNine = holes.filter(h => h.hole_number <= 9);
    const backNine = holes.filter(h => h.hole_number > 9);

    return (
        <div className="min-h-screen bg-white p-6 md:p-12 font-sans text-gray-900">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8 flex items-center justify-between">
                <Link href={`/settings/course/${initialCourse.id}`} className="flex items-center gap-2 text-sm font-bold bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Cancel
                </Link>
                <div className="flex gap-4">
                    <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto space-y-8">

                {/* 1. Global Course Settings */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h2 className="font-bold text-lg mb-4">Course Details</h2>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Course Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full max-w-md p-2 border border-gray-300 rounded font-bold"
                        />
                    </div>
                </div>

                {/* 2. Tee Boxes */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h2 className="font-bold text-lg mb-4">Tee Boxes</h2>
                    <div className="space-y-4">
                        {tees.map((tee, idx) => (
                            <div key={tee.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                <div>
                                    <label className="text-xs uppercase font-bold text-gray-500">Color/Name</label>
                                    <input
                                        type="text"
                                        value={tee.name}
                                        onChange={(e) => handleTeeChange(idx, 'name', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase font-bold text-gray-500">Rating</label>
                                    <input
                                        type="number" step="0.1"
                                        value={tee.rating}
                                        onChange={(e) => handleTeeChange(idx, 'rating', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase font-bold text-gray-500">Slope</label>
                                    <input
                                        type="number"
                                        value={tee.slope}
                                        onChange={(e) => handleTeeChange(idx, 'slope', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Holes (Par & Difficulty) */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h2 className="font-bold text-lg mb-4">Hole Data</h2>
                    <p className="text-sm text-gray-500 mb-4">Edit Par and Handicap (Difficulty) for each hole. Yardages are managed per tee box if needed (not shown).</p>

                    {/* Front 9 */}
                    <h3 className="font-bold text-md mt-6 mb-2">Front Nine</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-center bg-white border border-gray-200 rounded-lg">
                            <thead className="bg-gray-100 font-bold text-sm text-gray-700">
                                <tr>
                                    <th className="py-2 px-2 text-left">Hole</th>
                                    {frontNine.map(h => <th key={h.id} className="py-2 px-1 w-12">{h.hole_number}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t border-gray-100">
                                    <td className="py-2 px-2 text-left font-bold text-sm">Par</td>
                                    {frontNine.map((h, i) => (
                                        <td key={h.id} className="p-1">
                                            <input
                                                type="number"
                                                className="w-10 text-center border border-gray-300 rounded p-1"
                                                value={h.par}
                                                onChange={(e) => handleHoleChange(i, 'par', e.target.value)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-t border-gray-100">
                                    <td className="py-2 px-2 text-left font-bold text-sm text-gray-500">Hardness</td>
                                    {frontNine.map((h, i) => (
                                        <td key={h.id} className="p-1">
                                            <input
                                                type="number"
                                                className="w-10 text-center border border-gray-300 rounded p-1 text-gray-600"
                                                value={h.difficulty ?? ''}
                                                onChange={(e) => handleHoleChange(i, 'difficulty', e.target.value)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Back 9 */}
                    <h3 className="font-bold text-md mt-6 mb-2">Back Nine</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-center bg-white border border-gray-200 rounded-lg">
                            <thead className="bg-gray-100 font-bold text-sm text-gray-700">
                                <tr>
                                    <th className="py-2 px-2 text-left">Hole</th>
                                    {backNine.map(h => <th key={h.id} className="py-2 px-1 w-12">{h.hole_number}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t border-gray-100">
                                    <td className="py-2 px-2 text-left font-bold text-sm">Par</td>
                                    {backNine.map((h, i) => ( // Note: i is relative to this array!
                                        // Need to find global index.
                                        // frontNine len is 9. Index = 9 + i
                                        <td key={h.id} className="p-1">
                                            <input
                                                type="number"
                                                className="w-10 text-center border border-gray-300 rounded p-1"
                                                value={h.par}
                                                onChange={(e) => handleHoleChange(frontNine.length + i, 'par', e.target.value)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-t border-gray-100">
                                    <td className="py-2 px-2 text-left font-bold text-sm text-gray-500">Hcp</td>
                                    {backNine.map((h, i) => (
                                        <td key={h.id} className="p-1">
                                            <input
                                                type="number"
                                                className="w-10 text-center border border-gray-300 rounded p-1 text-gray-600"
                                                value={h.difficulty ?? ''}
                                                onChange={(e) => handleHoleChange(frontNine.length + i, 'difficulty', e.target.value)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>

            </div>
        </div>
    );
}
