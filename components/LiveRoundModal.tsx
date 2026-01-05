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
    } | null;
}

export function LiveRoundModal({
    isOpen,
    onClose,
    courseId,
    existingRound
}: LiveRoundModalProps) {
    const today = new Date().toISOString().split('T')[0];

    const [name, setName] = useState('City Park North');
    const [date, setDate] = useState(today);
    const [par, setPar] = useState(68);
    const [rating, setRating] = useState(63.8);
    const [slope, setSlope] = useState(100);
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
        }
    }, [existingRound, isOpen, today]);

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
                if (!courseId) {
                    alert('Error: No Course ID selected. Please refresh.');
                    setIsSaving(false);
                    return;
                }
                const result = await createLiveRound({
                    name: name || 'Live Round',
                    date: date || today,
                    courseId,
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
                    <div>
                        <label className="block text-[12pt] font-bold text-gray-700 mb-1">Course Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:ring-2 focus:ring-black outline-none"
                            placeholder="e.g. City Park North"
                        />
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
