'use client';

import { useState, useEffect } from 'react';

interface Player {
    id: string;
    name: string;
    birthday: string | null; // Format: YYYY-MM-DD
}

interface BirthdayPopupProps {
    players: Player[];
}

export default function BirthdayPopup({ players }: BirthdayPopupProps) {
    const [birthdayPlayers, setBirthdayPlayers] = useState<Player[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check for birthdays today
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 0-indexed
        const currentDay = today.getDate();

        const matches = players.filter(player => {
            if (!player.birthday) return false;

            // Parse YYYY-MM-DD
            const parts = player.birthday.split('-');
            if (parts.length !== 3) return false;

            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);

            return month === currentMonth && day === currentDay;
        });

        if (matches.length > 0) {
            // Check if we've already shown the popup for this session
            const hasShown = sessionStorage.getItem('birthday_popup_shown');
            if (!hasShown) {
                setBirthdayPlayers(matches);
                setIsOpen(true);
                sessionStorage.setItem('birthday_popup_shown', 'true');
            }
        }
    }, [players]);

    if (!isOpen || birthdayPlayers.length === 0) return null;

    return (
        <div
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="animate-in zoom-in-95 duration-500 flex flex-col items-center gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-white rounded-2xl px-6 py-4 shadow-2xl flex flex-col items-center max-w-sm mx-4 border-4 border-pink-400">
                    <div className="text-[100pt] leading-none mb-2">🎂</div>
                    <h1 className="text-[30pt] font-black text-pink-500 mb-4 text-center leading-tight drop-shadow-sm uppercase italic">
                        Happy Birthday!
                    </h1>

                    <div className="text-[18pt] font-bold text-gray-900 text-center mb-4 w-full">
                        {birthdayPlayers.map((player, index) => (
                            <div key={player.id} className="mb-2 last:mb-0 border-b last:border-0 border-gray-100 pb-2 last:pb-0">
                                <div className="leading-tight">{player.name}</div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                        className="w-full bg-black text-white rounded-full py-2 text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
