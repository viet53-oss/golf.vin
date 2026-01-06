'use client';

import { useState, useRef } from 'react';
import { addManualScore } from '@/app/actions/add-manual-score';

interface ManualScoreFormProps {
    players: Array<{ id: string; name: string; preferred_tee_box: string | null }>;
    course: any;
    coursePar: number;
}

export default function ManualScoreForm({ players, course, coursePar }: ManualScoreFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
    const formRef = useRef<HTMLFormElement>(null);

    const selectedPlayer = players.find(p => p.id === selectedPlayerId);
    const preferredTee = selectedPlayer?.preferred_tee_box || 'White';
    const teeBox = course?.tee_boxes?.find((t: any) => t.name === preferredTee);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const result = await addManualScore(formData);

        setIsSubmitting(false);

        if (result.success) {
            alert('Manual score added successfully!');
            formRef.current?.reset();
            setSelectedPlayerId('');
        } else {
            alert(result.error || 'Failed to add manual score');
        }
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Player Selection */}
                <div>
                    <label htmlFor="playerId" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Player <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="playerId"
                        name="playerId"
                        required
                        value={selectedPlayerId}
                        onChange={(e) => setSelectedPlayerId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        disabled={isSubmitting}
                    >
                        <option value="">Select a player...</option>
                        {players.map((player) => (
                            <option key={player.id} value={player.id}>
                                {player.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date Played */}
                <div>
                    <label htmlFor="datePlayed" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Date Played <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        id="datePlayed"
                        name="datePlayed"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        disabled={isSubmitting}
                    />
                </div>


                {/* Adjusted Gross Score */}
                <div>
                    <label htmlFor="adjustedGrossScore" className="block text-[14pt] font-bold text-gray-700 mb-2">
                        Adjusted Gross Score <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="adjustedGrossScore"
                        name="adjustedGrossScore"
                        required
                        min="50"
                        max="150"
                        placeholder="e.g., 88"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                        disabled={isSubmitting}
                    />
                    <p className="text-[11pt] text-gray-500 mt-1">Max score per hole: Par + 2</p>
                </div>
            </div>

            {/* Player Tee Box Info */}
            {selectedPlayer && teeBox && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-[14pt] font-bold text-green-900 mb-2">
                        {selectedPlayer.name}'s Preferred Tee: {preferredTee}
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-[14pt]">
                        <div>
                            <span className="text-gray-600">Par:</span>
                            <span className="ml-2 font-bold text-gray-900">{coursePar}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Rating:</span>
                            <span className="ml-2 font-bold text-gray-900">{teeBox.rating}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Slope:</span>
                            <span className="ml-2 font-bold text-gray-900">{teeBox.slope}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-[12pt] text-blue-800">
                    <strong>Note:</strong> Score Differential will be calculated automatically using the formula: (Adjusted Gross Score - Course Rating) × (113 / Slope Rating)
                </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
                <button
                    type="submit"
                    className="px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Adding Score...' : 'Add Manual Score'}
                </button>
            </div>
        </form>
    );
}
