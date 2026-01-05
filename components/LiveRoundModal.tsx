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
        setIsSaving(true);
        try {
            if (existingRound) {
                const result = await updateLiveRound({
                    id: existingRound.id,
                    name,
                    date,
                    par,
                    rating,
                    slope
                });
                if (result.success) {
                    onClose();
                } else {
                    alert(result.error);
                }
            } else if (courseId) {
                const result = await createLiveRound({
                    name,
                    date,
                    courseId,
                    par,
                    rating,
                    slope
                });
                if (result.success) {
                    window.location.href = `/live?roundId=${result.liveRoundId}`;
                    onClose();
                } else {
                    alert(result.error);
                }
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred');
        } finally {
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
                        className="bg-black text-white px-8 py-2 rounded-full text-[14pt] font-bold shadow-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </>
                        ) : (
                            'Save Round'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
