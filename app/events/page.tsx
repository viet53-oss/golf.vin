'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTournamentRound } from '../actions';

interface Event {
    name: string;
    date: string; // Display string like "Sunday, March 1, 2026"
    rawDate?: string; // ISO string for DB like "2026-03-01"
    location?: string;
}

export default function EventsPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [events, setEvents] = useState<Event[]>([
        { name: '1st Tournament of 2026', date: 'Sunday, March 1, 2026', rawDate: '2026-03-01' },
        { name: 'Ray Ferran Memorial 2026', date: 'Saturday, October 3, 2026', rawDate: '2026-10-03' },
        { name: 'Mickey Hurley Memorial 2026', date: 'Saturday, October 17, 2026', rawDate: '2026-10-17' },
        { name: 'All Saints Day 2026', date: 'Saturday, October 31, 2026', rawDate: '2026-10-31' },
        { name: 'Turkey 2026', date: 'Saturday, November 14, 2026', rawDate: '2026-11-14' },
        { name: 'Good Cheer 2026', date: 'Saturday, November 28, 2026', rawDate: '2026-11-28' },
        { name: 'CPGC Year End Party', date: 'Friday, December 4, 2026', rawDate: '2026-12-04', location: 'Location TBD' }
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEventName, setNewEventName] = useState('');
    const [newEventDate, setNewEventDate] = useState('');

    const handleAddEvent = () => {
        if (!newEventName || !newEventDate) return;

        // Format date string for display
        const dateObj = new Date(newEventDate);
        const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        setEvents([...events, { name: newEventName, date: displayDate, rawDate: newEventDate }]);
        setNewEventName('');
        setNewEventDate('');
        setIsModalOpen(false);
    };

    const handleStartTournament = (event: Event) => {
        startTransition(async () => {
            try {
                // Use the raw date if available, otherwise fallback to today or parsing
                const dateToUse = event.rawDate || new Date().toISOString().split('T')[0];
                const newRoundId = await createTournamentRound(event.name, dateToUse);
                router.push(`/scores/${newRoundId}/edit`);
            } catch (error) {
                console.error('Failed to start tournament:', error);
                alert('Failed to start tournament. Ensure database is connected.');
            }
        });
    };

    const handleDeleteEvent = (index: number) => {
        if (confirm('Are you sure you want to delete this event?')) {
            const newEvents = [...events];
            newEvents.splice(index, 1);
            setEvents(newEvents);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50 px-3 py-3">
                {/* 
                   Used Grid to perfectly center the title while handling different widths of left/right elements.
                   Left: Back Button
                   Center: Title
                   Right: Add Button
                */}
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                    <div className="flex justify-start">
                        <Link href="/" className="px-4 py-2 bg-black text-white rounded-full text-[18pt] font-bold hover:bg-gray-800 transition-colors shadow-sm whitespace-nowrap">
                            Back
                        </Link>
                    </div>

                    <div className="flex justify-center">
                        <h1 className="text-[18pt] font-bold text-green-600 tracking-tight text-center">Events</h1>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-black text-white text-[12pt] font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition-colors shadow-sm whitespace-nowrap"
                        >
                            Add Tournament
                        </button>
                    </div>
                </div>
            </header>

            <main className="px-3 py-6 space-y-4">
                {events.map((event, index) => (
                    <div key={index} className="bg-white border-2 border-gray-400 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                        <div className="space-y-1">
                            <h3 className="font-bold text-[15pt] text-black">{event.name}</h3>
                            <div className="flex items-center gap-2 text-gray-600 text-[12pt]">
                                <span className="text-gray-400">📅</span>
                                <span>{event.date}</span>
                                {event.location && <span className="text-gray-400 text-sm ml-2">📍 {event.location}</span>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                            <button
                                onClick={() => handleStartTournament(event)}
                                disabled={isPending}
                                className="flex-1 md:flex-none bg-[#22c55e] text-white px-4 py-1.5 rounded-full font-bold text-[12pt] flex items-center justify-center gap-1 hover:bg-green-600 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
                            >
                                <span className="text-sm bg-white text-green-600 rounded-full w-4 h-4 flex items-center justify-center">▶</span>
                                {isPending ? 'Starting...' : 'Start Tournament'}
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                            </button>
                            <button
                                onClick={() => handleDeleteEvent(index)}
                                className="p-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </main>

            {/* Add Event Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
                        <h2 className="text-2xl font-black text-gray-900 border-b pb-2">Add New Tournament</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tournament Name</label>
                                <input
                                    type="text"
                                    value={newEventName}
                                    onChange={(e) => setNewEventName(e.target.value)}
                                    placeholder="e.g. Club Championship"
                                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg font-bold focus:border-black focus:ring-0 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={newEventDate}
                                    onChange={(e) => setNewEventDate(e.target.value)}
                                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-black focus:ring-0 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEvent}
                                className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg"
                            >
                                Save Event
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
