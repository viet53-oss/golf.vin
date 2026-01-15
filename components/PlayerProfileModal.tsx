
'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, X, Calendar } from 'lucide-react';
import { Player, Round, TeeBox, HandicapRound, RoundPlayer } from '@prisma/client';
import { updatePlayerProfile } from '@/app/actions/update-player';

export type PlayerWithRounds = Player & {
    rounds: (RoundPlayer & {
        round: Round;
        tee_box: TeeBox | null;
    })[];
    manual_rounds: HandicapRound[];
};

interface PlayerProfileModalProps {
    player: PlayerWithRounds;
    isOpen: boolean;
    onClose: () => void;
    liveIndex: number;
    courseHandicap: number;
}

export function PlayerProfileModal({ player, isOpen, onClose, liveIndex, courseHandicap }: PlayerProfileModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    // Derived Data for Display
    const points = player.rounds.reduce((sum, r) => sum + (r.points || 0), 0);
    const allTimeWinnings = player.rounds.reduce((sum, r) => sum + (r.payout || 0), 0);

    // YTD Winnings (for current year)
    const currentYear = new Date().getFullYear().toString();
    const ytdWinnings = player.rounds
        .filter(r => r.round.date.startsWith(currentYear))
        .reduce((sum, r) => sum + (r.payout || 0), 0);

    const lowIndex = player.low_handicap_index ?? '-';
    // Display value for tee
    const displayTee = player.preferred_tee_box || 'White';

    // Handle Form Submit
    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSaving(true);
        const formData = new FormData(event.currentTarget);
        formData.append('id', player.id); // Ensure ID is passed

        const result = await updatePlayerProfile(formData);
        setIsSaving(false);
        if (result.success) {
            setIsEditing(false);
            window.location.reload(); // Simple force reload to see changes immediately for MVP
        } else {
            alert('Failed to save changes');
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full h-full shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="relative pt-8 pb-4 px-1 text-left border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-6 top-6 px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors mr-3"
                        >
                            Close
                        </button>

                        <h2 className="text-[14pt] font-extrabold text-gray-900 tracking-tight ml-3">
                            {player.name}
                        </h2>
                        <p className="text-gray-500 font-medium mt-1 uppercase tracking-wide text-[14pt] ml-3">Player Profile</p>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto px-1 py-6 space-y-8 no-scrollbar bg-white flex-1">

                        {!isEditing ? (
                            // --- VIEW MODE ---
                            <>
                                {/* Stats Row */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-100">
                                        <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-widest mb-1">HCP</span>
                                        <span className="text-[14pt] font-black text-slate-800">{courseHandicap}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-100">
                                        <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-widest mb-1">INDEX</span>
                                        <span className="text-[14pt] font-black text-slate-800">{liveIndex.toFixed(1)}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-100">
                                        <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-widest mb-1">POINTS</span>
                                        <span className="text-[14pt] font-black text-slate-800">{points}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-100">
                                        <span className="text-[14pt] font-bold text-gray-400 uppercase tracking-widest mb-1">LOW INDEX</span>
                                        <span className="text-[14pt] font-black text-slate-800">{lowIndex}</span>
                                    </div>
                                </div>

                                {/* Winnings Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100 flex flex-col items-center justify-center text-center shadow-sm">
                                        <span className="text-[14pt] font-bold text-emerald-600 uppercase tracking-wider mb-2">YTD Winning</span>
                                        <span className="text-[14pt] font-black text-emerald-700">${ytdWinnings.toFixed(2)}</span>
                                        <span className="text-[14pt] font-bold text-emerald-400 mt-1">{currentYear}</span>
                                    </div>
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-orange-100 flex flex-col items-center justify-center text-center shadow-sm">
                                        <span className="text-[14pt] font-bold text-orange-600 uppercase tracking-wider mb-2">Gross Winning</span>
                                        <span className="text-[14pt] font-black text-orange-700">${allTimeWinnings.toFixed(2)}</span>
                                        <span className="text-[14pt] font-bold text-orange-400 mt-1">All Time</span>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-purple-500">#</span>
                                        <h3 className="font-bold text-gray-900 text-[14pt]">Contact Information</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border border-gray-100 rounded-xl p-4 flex gap-4 items-start">
                                            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                                                <Mail size={18} />
                                            </div>
                                            <div>
                                                <span className="text-[14pt] font-bold text-gray-400 uppercase block mb-0.5">Email</span>
                                                <span className="font-semibold text-gray-900 break-all">{player.email || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="border border-gray-100 rounded-xl p-4 flex gap-4 items-start">
                                            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                                                <Phone size={18} />
                                            </div>
                                            <div>
                                                <span className="text-[14pt] font-bold text-gray-400 uppercase block mb-0.5">Phone</span>
                                                <span className="font-semibold text-gray-900">{player.phone || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Address & Personal */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <MapPin className="text-blue-500 w-5 h-5" />
                                        <h3 className="font-bold text-gray-900 text-[14pt]">Address & Personal</h3>
                                    </div>
                                    <div className="border border-gray-100 rounded-xl p-0 overflow-hidden divide-y divide-gray-50">
                                        <div className="grid grid-cols-1 md:grid-cols-2">
                                            <div className="p-5">
                                                <span className="text-[14pt] font-bold text-blue-900/40 uppercase block mb-1">Address</span>
                                                <div className="font-medium text-gray-700 space-y-0.5">
                                                    <p>{player.address || '-'}</p>
                                                    <p>
                                                        {player.city}{player.state ? `, ${player.state}` : ''} {player.zip}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-gray-50/30">
                                                <span className="text-[14pt] font-bold text-blue-900/40 uppercase block mb-1">Birthday</span>
                                                <p className="font-semibold text-gray-700 font-mono text-[14pt]">{player.birthday || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <span className="text-[14pt] font-bold text-blue-900/40 uppercase block mb-1">Player Since</span>
                                            <p className="font-bold text-gray-900">{player.year_joined || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Golf Profile */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrophyIcon className="text-yellow-500 w-5 h-5" />
                                        <h3 className="font-bold text-gray-900 text-[14pt]">Golf Profile</h3>
                                    </div>
                                    <div className="border border-gray-100 rounded-xl p-5">
                                        <div className="flex gap-4 items-center">
                                            <div className="p-2 bg-gray-50 text-gray-500 rounded-lg">
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <span className="text-[14pt] font-bold text-gray-400 uppercase block mb-0.5">Preferred Tee Box</span>
                                                <span className="font-bold text-gray-900 text-[14pt]">{displayTee}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // --- EDIT MODE ---
                            <div className="space-y-6">
                                <div className="space-y-6">
                                    {/* Name Inputs */}
                                    <div>
                                        <h4 className="text-[14pt] font-bold text-gray-900 uppercase tracking-wide mb-3 border-b pb-1">Name</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">First Name</label>
                                                <input
                                                    name="firstName"
                                                    defaultValue={player.name.split(' ')[0]}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="First"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Last Name</label>
                                                <input
                                                    name="lastName"
                                                    defaultValue={player.name.split(' ').slice(1).join(' ')}
                                                    className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Last"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Inputs */}
                                    <div>
                                        <h4 className="text-[14pt] font-bold text-gray-900 uppercase tracking-wide mb-3 border-b pb-1">Contact</h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Email</label>
                                                <input name="email" defaultValue={player.email || ''} className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="email@example.com" />
                                            </div>
                                            <div>
                                                <label className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Phone</label>
                                                <input name="phone" defaultValue={player.phone || ''} className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="555-555-5555" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal Inputs */}
                                    <div>
                                        <h4 className="text-[14pt] font-bold text-gray-900 uppercase tracking-wide mb-3 border-b pb-1">Personal</h4>
                                        <div>
                                            <label className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Birthday</label>
                                            <input type="date" name="birthday" defaultValue={player.birthday || ''} className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Golf Inputs */}
                                <div>
                                    <h4 className="text-[14pt] font-bold text-gray-900 uppercase tracking-wide mb-3 border-b pb-1">Golf Preferences</h4>
                                    <div>
                                        <label className="block text-[14pt] font-bold text-gray-500 mb-1 uppercase">Preferred Tee Box</label>
                                        <select name="preferred_tee_box" defaultValue={player.preferred_tee_box || 'White'} className="w-full text-[14pt] p-2 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option value="White">White</option>
                                            <option value="Gold">Gold</option>
                                            <option value="Blue">Blue</option>
                                            <option value="Red">Red</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 rounded-full font-bold text-[15pt] text-gray-600 hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full font-bold text-[15pt] shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-full font-bold text-[15pt] shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95"
                            >
                                Edit Player Profile
                            </button>
                        )}
                    </div>
                </form>

            </div>
        </div>
    );
}

function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}
