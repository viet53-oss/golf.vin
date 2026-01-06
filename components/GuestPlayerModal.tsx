'use client';

import { useState, useEffect } from 'react';

interface GuestPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (guest: { name: string; index: number; courseHandicap: number }) => void;
    onUpdate?: (guestId: string, guest: { name: string; index: number; courseHandicap: number }) => void;
    roundData?: {
        rating: number;
        slope: number;
        par: number;
    } | null;
    editingGuest?: {
        id: string;
        name: string;
        index: number;
        courseHandicap: number;
    } | null;
}

export function GuestPlayerModal({ isOpen, onClose, onAdd, onUpdate, roundData, editingGuest }: GuestPlayerModalProps) {
    const [name, setName] = useState('');
    const [index, setIndex] = useState('0');
    const [courseHandicap, setCourseHandicap] = useState('0');

    // Load editing guest data when modal opens
    useEffect(() => {
        if (editingGuest) {
            setName(editingGuest.name);
            setIndex(editingGuest.index.toString());
            setCourseHandicap(editingGuest.courseHandicap.toString());
        } else {
            setName('');
            setIndex('0');
            setCourseHandicap('0');
        }
    }, [editingGuest, isOpen]);

    // Auto-calculate course handicap when index changes (only if not manually edited)
    useEffect(() => {
        if (roundData && index && !editingGuest) {
            const indexNum = parseFloat(index) || 0;
            const { rating, slope, par } = roundData;

            // Course Handicap formula: (Index × Slope / 113) + (Rating - Par)
            const calculatedHandicap = Math.round((indexNum * slope / 113) + (rating - par));
            setCourseHandicap(calculatedHandicap.toString());
        }
    }, [index, roundData, editingGuest]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('Please enter a name');
            return;
        }

        const guestData = {
            name: name.trim(),
            index: parseFloat(index) || 0,
            courseHandicap: parseInt(courseHandicap) || 0
        };

        if (editingGuest && onUpdate) {
            onUpdate(editingGuest.id, guestData);
        } else {
            onAdd(guestData);
        }

        // Reset form
        setName('');
        setIndex('0');
        setCourseHandicap('0');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">
                    {editingGuest ? 'Edit Guest Player' : 'Add Guest Player'}
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                            placeholder="Guest Name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Handicap Index
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={index}
                            onChange={(e) => setIndex(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Course Handicap {roundData && !editingGuest && <span className="text-xs text-gray-500">(Auto-calculated)</span>}
                        </label>
                        <input
                            type="number"
                            value={courseHandicap}
                            onChange={(e) => setCourseHandicap(e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                        />
                        {roundData && !editingGuest && (
                            <p className="text-xs text-gray-500 mt-1">
                                Based on Rating: {roundData.rating}, Slope: {roundData.slope}, Par: {roundData.par}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
                    >
                        {editingGuest ? 'Update Guest' : 'Add Guest'}
                    </button>
                </div>
            </div>
        </div>
    );
}
