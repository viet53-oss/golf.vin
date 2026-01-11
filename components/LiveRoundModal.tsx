'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createLiveRound, updateLiveRound } from '@/app/actions/create-live-round';

interface LiveRoundModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId?: string;
    existingRound?: {
        id: string;
        name: string;
        date: string;
        par: number;
        rating: number;
        slope: number;
        course_id?: string;
    } | null;
    allCourses?: any[]; // Using any[] for simplicity or define full type
    showAlert: (title: string, message: string) => void;
}

export function LiveRoundModal({
    isOpen,
    onClose,
    courseId,
    existingRound,
    allCourses = [],
    showAlert
}: LiveRoundModalProps) {
    const router = useRouter();
    const today = new Date().toISOString().split('T')[0];

    const [name, setName] = useState('');
    const [date, setDate] = useState(today);
    const [par, setPar] = useState(68);
    const [rating, setRating] = useState(63.8);
    const [slope, setSlope] = useState(100);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedTeeId, setSelectedTeeId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Always default to City Park North & White Tee when modal opens
            const cpNorth = allCourses.find(c => c.name.toLowerCase().includes('city park north'));
            const initialCourse = cpNorth || allCourses.find(c => c.id === courseId) || allCourses[0];

            if (initialCourse) {
                setSelectedCourseId(initialCourse.id);
                setName(initialCourse.name);

                // Use existing round's date if editing, otherwise use today
                setDate(existingRound?.date || today);

                // Find White tee or first available
                const whiteTee = initialCourse.tee_boxes.find((t: any) => t.name.toLowerCase().includes('white'));
                const initialTee = whiteTee || initialCourse.tee_boxes[0];

                if (initialTee) {
                    setSelectedTeeId(initialTee.id);
                    setRating(initialTee.rating);
                    setSlope(initialTee.slope);
                }

                // Calculate par
                if (initialCourse.holes?.length) {
                    const calcPar = initialCourse.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                    setPar(calcPar);
                } else {
                    setPar(68);
                }
            }
        }
    }, [isOpen, today, courseId, allCourses, existingRound]);

    if (!isOpen) return null;

    const handleSave = async () => {
        const parVal = isNaN(par) ? (existingRound?.par || 68) : par;
        const ratingVal = isNaN(rating) ? (existingRound?.rating || 63.8) : rating;
        const slopeVal = isNaN(slope) ? (existingRound?.slope || 100) : slope;

        setIsSaving(true);
        try {
            if (existingRound) {
                const result = await updateLiveRound({
                    id: existingRound.id,
                    name: name || 'Live Round',
                    date: date || today,
                    courseId: selectedCourseId || courseId,
                    par: parVal,
                    rating: ratingVal,
                    slope: slopeVal
                });

                if (result.success) {
                    onClose();
                    // Move to the round without scrolling
                    router.push(`/live?roundId=${existingRound.id}`, { scroll: false });
                    router.refresh();
                } else {
                    showAlert('Error', 'Save Failed: ' + result.error);
                    setIsSaving(false);
                }
            } else {
                const cId = selectedCourseId || courseId;
                if (!cId) {
                    showAlert('Error', 'No Course ID selected.');
                    setIsSaving(false);
                    return;
                }
                const result = await createLiveRound({
                    name: name || 'Live Round',
                    date: date || today,
                    courseId: cId,
                    courseName: allCourses.find((c: any) => c.id === cId)?.name || 'Unknown Course',
                    par: parVal,
                    rating: ratingVal,
                    slope: slopeVal
                });

                if (result.success && result.liveRoundId) {
                    onClose();
                    // Move to the new round
                    router.push(`/live?roundId=${result.liveRoundId}`, { scroll: false });
                } else {
                    showAlert('Error', 'Creation Failed: ' + (result.error || 'Server Error'));
                    setIsSaving(false);
                }
            }
        } catch (e) {
            console.error('CRASH:', e);
            showAlert('Error', 'A critical error occurred. Please refresh.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-black text-white flex justify-between items-center">
                    <h2 className="text-[18pt] font-bold text-left ml-3">{existingRound ? 'Edit Live Round' : 'New Live Round'}</h2>
                    <button onClick={onClose} className="hover:opacity-70 transition-opacity bg-white text-black text-[15pt] font-bold px-4 py-2 rounded-full">
                        Close
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-[12pt] font-bold text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none"
                        />
                    </div>

                    {/* Course Selection */}
                    <div>
                        <label className="block text-[12pt] font-bold text-gray-700 mb-1">Course</label>
                        <select
                            value={selectedCourseId}
                            onChange={(e) => {
                                const newId = e.target.value;
                                setSelectedCourseId(newId);
                                setSelectedTeeId(''); // Reset tee on course change
                                const c = allCourses.find(fc => fc.id === newId);
                                if (c) {
                                    setName(c.name);
                                    // Default to first tee box or White if available
                                    const whiteTee = c.tee_boxes.find((t: any) => t.name.toLowerCase().includes('white'));
                                    const devTee = whiteTee || c.tee_boxes[0];

                                    if (devTee) {
                                        setSelectedTeeId(devTee.id);
                                        setRating(devTee.rating);
                                        setSlope(devTee.slope);
                                    }

                                    if (c.holes?.length) {
                                        const cPar = c.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                                        setPar(cPar);
                                    }
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none bg-white"
                        >
                            <option value="" disabled>-- Select Course --</option>
                            {allCourses?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tee Box Selection (Helper for auto-filling) */}
                    <div>
                        <label className="block text-[12pt] font-bold text-gray-700 mb-1">Select Tee Box (Auto-fill)</label>
                        <select
                            value={selectedTeeId}
                            onChange={(e) => {
                                const tId = e.target.value;
                                setSelectedTeeId(tId);
                                const c = allCourses.find(fc => fc.id === selectedCourseId);
                                if (c) {
                                    const tee = c.tee_boxes.find((t: any) => t.id === tId);
                                    if (tee) {
                                        setRating(tee.rating);
                                        setSlope(tee.slope);
                                        const cPar = c.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                                        setPar(cPar || par);
                                    }
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none bg-white"
                        >
                            <option value="" disabled>-- Select Tee Box --</option>
                            {allCourses.find(c => c.id === selectedCourseId)?.tee_boxes.map((t: any) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} (R: {t.rating} / S: {t.slope})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[12pt] font-bold text-gray-700 mb-1">Par</label>
                            <input
                                type="number"
                                value={par}
                                onChange={(e) => setPar(parseInt(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[12pt] font-bold text-gray-700 mb-1">Rating</label>
                            <input
                                type="number"
                                step="0.1"
                                value={rating}
                                onChange={(e) => setRating(parseFloat(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[12pt] font-bold text-gray-700 mb-1">Slope</label>
                            <input
                                type="number"
                                value={slope}
                                onChange={(e) => setSlope(parseInt(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 mt-2">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-full text-[15pt] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-black text-white px-4 py-2 rounded-full text-[15pt] font-bold shadow-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                        {isSaving ? 'Saving...' : 'Save Round'}
                    </button>
                </div>
            </div>
        </div>
    );
}
