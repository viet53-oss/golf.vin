'use client';

import { useState, useEffect } from 'react';
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
}

export function LiveRoundModal({
    isOpen,
    onClose,
    courseId,
    existingRound,
    allCourses = []
}: LiveRoundModalProps) {
    const today = new Date().toISOString().split('T')[0];

    const [name, setName] = useState('City Park North');
    const [date, setDate] = useState(today);
    const [par, setPar] = useState(68);
    const [rating, setRating] = useState(63.8);
    const [slope, setSlope] = useState(100);
    const [selectedCourseId, setSelectedCourseId] = useState(courseId || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (existingRound) {
            setName(existingRound.name);
            setDate(existingRound.date);
            setPar(existingRound.par);
            setRating(existingRound.rating);
            setSlope(existingRound.slope);
        } else {
            setName('City Park North');
            setDate(today);
            setPar(68);
            setRating(63.8);
            setSlope(100);
            setSelectedCourseId(courseId || '');
        }
    }, [existingRound, isOpen, today, courseId]);

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
                    par: parVal,
                    rating: ratingVal,
                    slope: slopeVal
                });

                if (result.success) {
                    onClose();
                    // Hard redirect to clear out all old scoring data and refresh with new course metadata
                    window.location.href = `/live?roundId=${existingRound.id}&r=${Date.now()}`;
                } else {
                    alert('Save Failed: ' + result.error);
                    setIsSaving(false);
                }
            } else {
                const cId = selectedCourseId || courseId;
                if (!cId) {
                    alert('Error: No Course ID selected.');
                    setIsSaving(false);
                    return;
                }
                const result = await createLiveRound({
                    name: name || 'Live Round',
                    date: date || today,
                    courseId: cId,
                    par: parVal,
                    rating: ratingVal,
                    slope: slopeVal
                });

                if (result.success && result.liveRoundId) {
                    onClose();
                    // Move to the new round
                    window.location.href = `/live?roundId=${result.liveRoundId}`;
                } else {
                    alert('Creation Failed: ' + (result.error || 'Server Error'));
                    setIsSaving(false);
                }
            }
        } catch (e) {
            console.error('CRASH:', e);
            alert('A critical error occurred. Please refresh.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-black text-white flex justify-between items-center">
                    <h2 className="text-[16pt] font-bold">{existingRound ? 'Edit Live Round' : 'New Live Round'}</h2>
                    <button onClick={onClose} className="hover:opacity-70 transition-opacity">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
                                const c = allCourses.find(fc => fc.id === newId);
                                if (c) {
                                    setName(c.name);
                                    // Default to first tee box
                                    if (c.tee_boxes.length > 0) {
                                        const defaultTee = c.tee_boxes[0];
                                        // Calculate par from holes
                                        const cPar = c.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                                        setPar(cPar || 72);
                                        setRating(defaultTee.rating);
                                        setSlope(defaultTee.slope);
                                    }
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none bg-white"
                        >
                            <option value="">-- Select Course --</option>
                            {allCourses?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tee Box Selection (Helper for auto-filling) */}
                    <div>
                        <label className="block text-[12pt] font-bold text-gray-700 mb-1">Select Tee Box (Auto-fill)</label>
                        <select
                            onChange={(e) => {
                                const tId = e.target.value;
                                const c = allCourses.find(fc => fc.id === selectedCourseId);
                                if (c) {
                                    const tee = c.tee_boxes.find((t: any) => t.id === tId);
                                    if (tee) {
                                        setRating(tee.rating);
                                        setSlope(tee.slope);
                                        // Par typically implies Course Par, but if we want to be safe, recalculate
                                        const cPar = c.holes.reduce((sum: number, h: any) => sum + h.par, 0);
                                        setPar(cPar || 72);
                                    }
                                }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none bg-white"
                            defaultValue=""
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
                        className="px-6 py-2 rounded-full text-[14pt] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-black text-white px-8 py-2 rounded-full text-[14pt] font-bold shadow-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                        {isSaving ? 'Saving...' : 'Save Round'}
                    </button>
                </div>
            </div>
        </div>
    );
}
