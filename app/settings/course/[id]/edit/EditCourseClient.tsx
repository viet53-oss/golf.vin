'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { updateCourse } from '@/app/actions/update-course';
import { createCourse } from '@/app/actions/create-course';

// Types matching Prisma include
type CourseData = {
    id: string;
    name: string;
    tee_boxes: { id: string; name: string; rating: number; slope: number }[];
    holes: { id: string; hole_number: number; par: number; difficulty: number | null, latitude?: number | string | null, longitude?: number | string | null }[];
};

export default function EditCourseClient({ initialCourse, isNew = false }: { initialCourse: CourseData, isNew?: boolean }) {
    const [name, setName] = useState(initialCourse.name);
    const [tees, setTees] = useState(initialCourse.tee_boxes);
    const [holes, setHoles] = useState(initialCourse.holes); // Should be sorted 1-18
    const [coursePar, setCoursePar] = useState(initialCourse.holes.reduce((sum, h) => sum + (h.par || 0), 0));

    useEffect(() => {
        const total = holes.reduce((sum, h) => sum + (h.par || 0), 0);
        setCoursePar(total);
    }, [holes]);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Ensure we have exactly 18 holes state even if DB gaps (unlikely but safe)
    // Actually we will just respect DB state for simplicity unless create mode.

    const handleHoleChange = (index: number, field: 'par' | 'difficulty' | 'latitude' | 'longitude' | 'gps', value: string) => {
        const newHoles = [...holes];

        if (field === 'gps') {
            const trimmed = value.trim();
            // Split by space(s) or comma
            const parts = trimmed.split(/[\s,]+/).filter(p => p.length > 0);
            if (parts.length >= 2) {
                // If we find two or more parts, take the first two as lat/long
                newHoles[index] = {
                    ...newHoles[index],
                    latitude: parts[0],
                    longitude: parts[1]
                };
            } else {
                // Only one part, assume it's latitude
                newHoles[index] = {
                    ...newHoles[index],
                    latitude: value,
                    longitude: ''
                };
            }
            setHoles(newHoles);
            return;
        }

        const numVal = parseInt(value) || 0;
        if (field === 'par') newHoles[index] = { ...newHoles[index], par: numVal };
        else if (field === 'difficulty') newHoles[index] = { ...newHoles[index], difficulty: numVal };
        else newHoles[index] = { ...newHoles[index], [field]: value }; // Store string for lat/long
        setHoles(newHoles);
    };

    const handleTeeChange = (index: number, field: 'name' | 'rating' | 'slope', value: string) => {
        const newTees = [...tees];
        if (field === 'name') newTees[index] = { ...newTees[index], name: value };
        else newTees[index] = { ...newTees[index], [field]: parseFloat(value) || 0 };
        setTees(newTees);
    };



    const parseCoordinate = (val: any): number | null => {
        if (!val || typeof val !== 'string') return typeof val === 'number' ? val : null;
        const trimmed = val.trim();
        if (trimmed === '') return null;

        // Try DMS format: 30°00'57.2"N or 90°05'22.0"W
        const dmsMatch = trimmed.match(/(\d+)°\s*(\d+)'\s*(\d+(?:\.\d+)?)"\s*([NSEW])/i);
        if (dmsMatch) {
            const d = parseFloat(dmsMatch[1]);
            const m = parseFloat(dmsMatch[2]);
            const s = parseFloat(dmsMatch[3]);
            const dir = dmsMatch[4].toUpperCase();
            let decimal = d + m / 60 + s / 3600;
            if (dir === 'S' || dir === 'W') decimal = -decimal;
            return decimal;
        }

        const parsed = parseFloat(trimmed);
        return isNaN(parsed) ? null : parsed;
    };

    const handleSubmit = () => {

        startTransition(async () => {
            if (isNew) {
                await createCourse({
                    name,
                    tees,
                    holes: holes.map(h => ({
                        hole_number: h.hole_number,
                        par: h.par,
                        difficulty: h.difficulty,
                        latitude: parseCoordinate(h.latitude),
                        longitude: parseCoordinate(h.longitude)
                    }))
                });
            } else {
                await updateCourse(initialCourse.id, {
                    name,
                    tees,
                    holes: holes.map(h => ({
                        id: h.id,
                        hole_number: h.hole_number,
                        par: h.par,
                        difficulty: h.difficulty,
                        latitude: parseCoordinate(h.latitude),
                        longitude: parseCoordinate(h.longitude)
                    }))
                });
            }
        });
    };



    // Split holes for UI
    const frontNine = holes.filter((h: any) => h.hole_number <= 9);
    const backNine = holes.filter((h: any) => h.hole_number > 9);

    return (
        <>
            <style jsx>{`
                input[type="number"]::-webkit-inner-spin-button,
                input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                }
            `}</style>
            <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-in fade-in">
                {/* Header */}
                <div className="bg-slate-50 border-b border-gray-100 px-1 py-4 flex justify-between items-center shrink-0">
                    <h1 className="text-[18pt] font-black text-gray-900 tracking-tight text-left ml-3">{isNew ? 'Add Course' : 'Edit Course'}</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save
                        </button>
                        <button
                            onClick={() => router.push('/settings')}
                            className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <form className="flex-1 overflow-y-auto px-1 py-6 bg-slate-50" onSubmit={(e) => e.preventDefault()}>
                    <div className="m-1 space-y-6">

                        {/* 1. Global Course Settings */}
                        <div className="bg-white rounded-xl shadow-sm border-2 border-black p-6">
                            <h2 className="font-bold mb-4">Course Details</h2>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block font-bold text-gray-700 mb-1">Course Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded font-bold"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block font-bold text-gray-700 mb-1">Par</label>
                                    <input
                                        type="number"
                                        value={coursePar === 0 ? '' : coursePar}
                                        onChange={(e) => setCoursePar(parseInt(e.target.value) || 0)}
                                        className="w-full p-2 border border-gray-300 rounded font-bold text-center"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Tee Boxes */}
                        <div className="bg-white rounded-xl shadow-sm border-2 border-black p-6">
                            <h2 className="font-bold mb-4">Tee Boxes</h2>
                            <div className="space-y-4">
                                {tees.map((tee: any, idx: number) => (
                                    <div key={tee.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <div>
                                            <label className="font-bold text-gray-500">Color/Name</label>
                                            <input
                                                type="text"
                                                value={tee.name}
                                                onChange={(e) => handleTeeChange(idx, 'name', e.target.value)}

                                                className="w-full p-2 border border-gray-300 rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-gray-500">Rating</label>
                                            <input
                                                type="number" step="0.1"
                                                value={tee.rating === 0 ? '' : tee.rating}
                                                onChange={(e) => handleTeeChange(idx, 'rating', e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-bold text-gray-500">Slope</label>
                                            <input
                                                type="number"
                                                value={tee.slope === 0 ? '' : tee.slope}
                                                onChange={(e) => handleTeeChange(idx, 'slope', e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded"
                                            />
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>

                        {/* 3. Holes (Par & Difficulty) */}
                        <div className="bg-white rounded-xl shadow-sm border-2 border-black p-6">
                            <h2 className="font-bold mb-4">Hole Data</h2>
                            <p className="text-gray-500 mb-4">Edit hole Par and Hardness.</p>

                            {/* Front 9 */}
                            <h3 className="font-bold mt-6 mb-2">Front Nine</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-center bg-white border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-100 font-bold text-gray-700">
                                        <tr>
                                            <th className="py-2 px-1 text-left w-16">Hole</th>
                                            {frontNine.map((h: any) => <th key={h.id} className="py-2 px-1 w-12">{h.hole_number}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t border-gray-100">
                                            <td className="py-2 px-1 text-left font-bold w-16">Par</td>
                                            {frontNine.map((h: any, i: number) => (
                                                <td key={h.id} className="p-1">
                                                    <input
                                                        type="number"
                                                        className="w-10 text-center border border-gray-300 rounded p-1"
                                                        value={h.par === 0 ? '' : h.par}
                                                        onChange={(e) => handleHoleChange(i, 'par', e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-t border-gray-100">
                                            <td className="py-2 px-1 text-left font-bold text-gray-500 w-16">Hardness</td>
                                            {frontNine.map((h: any, i: number) => (
                                                <td key={h.id} className="p-1">
                                                    <input
                                                        type="number"
                                                        className="w-10 text-center border border-gray-300 rounded p-1 text-gray-600"
                                                        value={h.difficulty === 0 || h.difficulty === null ? '' : h.difficulty}
                                                        onChange={(e) => handleHoleChange(i, 'difficulty', e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>

                                        <tr className="border-t border-gray-100">
                                            <td className="py-2 px-1 text-left font-bold text-gray-500 w-16">GPS</td>
                                            {frontNine.map((h: any, i: number) => (
                                                <td key={h.id} className="p-1">
                                                    <input
                                                        type="text"
                                                        className="w-16 text-center border border-gray-300 rounded p-1 text-[8px]"
                                                        placeholder="Lat Long"
                                                        value={h.latitude && h.longitude ? `${h.latitude} ${h.longitude}` : (h.latitude || h.longitude || '')}
                                                        onChange={(e) => handleHoleChange(i, 'gps', e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Back 9 */}
                            <h3 className="font-bold mt-6 mb-2">Back Nine</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-center bg-white border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-100 font-bold text-gray-700">
                                        <tr>
                                            <th className="py-2 px-1 text-left w-16">Hole</th>
                                            {backNine.map((h: any) => <th key={h.id} className="py-2 px-1 w-12">{h.hole_number}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t border-gray-100">
                                            <td className="py-2 px-1 text-left font-bold w-16">Par</td>
                                            {backNine.map((h: any, i: number) => ( // Note: i is relative to this array!
                                                // Need to find global index.
                                                // frontNine len is 9. Index = 9 + i
                                                <td key={h.id} className="p-1">
                                                    <input
                                                        type="number"
                                                        className="w-10 text-center border border-gray-300 rounded p-1"
                                                        value={h.par === 0 ? '' : h.par}
                                                        onChange={(e) => handleHoleChange(frontNine.length + i, 'par', e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="border-t border-gray-100">
                                            <td className="py-2 px-1 text-left font-bold text-gray-500 w-16">Hardness</td>
                                            {backNine.map((h: any, i: number) => (
                                                <td key={h.id} className="p-1">
                                                    <input
                                                        type="number"
                                                        className="w-10 text-center border border-gray-300 rounded p-1 text-gray-600"
                                                        value={h.difficulty === 0 || h.difficulty === null ? '' : h.difficulty}
                                                        onChange={(e) => handleHoleChange(frontNine.length + i, 'difficulty', e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>

                                        <tr className="border-t border-gray-100">
                                            <td className="py-2 px-1 text-left font-bold text-gray-500 w-16">GPS</td>
                                            {backNine.map((h: any, i: number) => (
                                                <td key={h.id} className="p-1">
                                                    <input
                                                        type="text"
                                                        className="w-16 text-center border border-gray-300 rounded p-1 text-[8px]"
                                                        placeholder="Lat Long"
                                                        value={h.latitude && h.longitude ? `${h.latitude} ${h.longitude}` : (h.latitude || h.longitude || '')}
                                                        onChange={(e) => handleHoleChange(frontNine.length + i, 'gps', e.target.value)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                        </div>

                    </div >
                </form >
            </div >
        </>
    );
}
