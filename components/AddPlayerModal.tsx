'use client';

import { useState } from 'react';
import { createPlayer } from '@/app/actions/create-player';
import { X } from 'lucide-react';

interface AddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddPlayerModal({ isOpen, onClose }: AddPlayerModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const result = await createPlayer(formData);

        setIsSubmitting(false);

        if (result.success) {
            alert('Player added successfully!');
            onClose();
        } else {
            alert(result.error || 'Failed to add player');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
                    <h2 className="text-[18pt] font-bold text-gray-900 text-center">Add New Player</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-[14pt] font-bold text-gray-700 mb-2">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            placeholder="First Last"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-[14pt] font-bold text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="player@example.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label htmlFor="phone" className="block text-[14pt] font-bold text-gray-700 mb-2">
                            Phone
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            placeholder="(123) 456-7890"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Preferred Tee Box */}
                    <div>
                        <label htmlFor="preferredTeeBox" className="block text-[14pt] font-bold text-gray-700 mb-2">
                            Preferred Tee Box
                        </label>
                        <select
                            id="preferredTeeBox"
                            name="preferredTeeBox"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14pt] focus:outline-none focus:ring-2 focus:ring-green-500"
                            disabled={isSubmitting}
                        >
                            <option value="White">White</option>
                            <option value="Gold">Gold</option>
                        </select>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-[14pt] font-bold hover:bg-gray-50 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-[14pt] font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Adding...' : 'Add Player'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
