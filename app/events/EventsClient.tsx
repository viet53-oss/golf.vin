'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createEvent, deleteEvent } from '../actions';

interface Event {
    id: string;
    name: string;
    date: string; // Display string
    rawDate?: string; // ISO string 
    location?: string;
}

interface EventsClientProps {
    initialEvents: Event[];
}

export default function EventsClient({ initialEvents }: EventsClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEventName, setNewEventName] = useState('');
    const [newEventDate, setNewEventDate] = useState('');

    const handleAddEvent = async () => {
        if (!newEventName || !newEventDate) return;

        startTransition(async () => {
            try {
                // Creates a standalone Event note
                await createEvent(newEventName, newEventDate);

                setNewEventName('');
                setNewEventDate('');
                setIsModalOpen(false);

                // Refresh the server component to pull new event
                router.refresh();
            } catch (error) {
                console.error('Failed to create event:', error);
                alert('Failed to save event.');
            }
        });
    };

    const handleDeleteEvent = (id: string) => {
        if (confirm('Are you sure you want to delete this event?')) {
            startTransition(async () => {
                try {
                    await deleteEvent(id);
                    router.refresh();
                } catch (error) {
                    console.error('Failed to delete:', error);
                    alert('Failed to delete event.');
                }
            });
        }
    };

    return (
        <div className="w-full">
            {/* 
               We need to teleport the "Add Button" to the Header if possible, OR just duplicate the button here?
               The user design had "Add Tournament" inside the header.
               Since the Header is in the Server Component (page.tsx), we can pass a "Portal" or just render the button THERE
               and control the modal HERE. But that's complex cross-boundary.
               
               Easiest approach:
               Render the "Add Tournament" button inside this Client Component but position it via CSS to *look* like it's in the header?
               OR, just put the interactive "add" button in the client component's flow.
               
               Wait, in previous `page.tsx`, the header was INSIDE the page. I kept the header in `page.tsx`.
               I should move the "Add Tournament" button into THIS client component and maybe use a Portal or just 
               render the Header *inside* this Client Component if I want full control.
               
               Let's render the header inside this Client Component to keep it simple and interactive.
            */}

            <header className="bg-white shadow-sm sticky top-0 z-50 px-3 py-3 -mt-6 -mx-3 mb-6"> {/* Negative margin to counteract page padding if necessary, but actually we are inside main div */}
                {/* Re-implementing Header here or assuming parent passes control?
                     The parent `page.tsx` renders the header. But the button needs to open `isModalOpen`.
                     
                     Solution: render the button in `page.tsx`? No, `page.tsx` is server.
                     Solution: The ENTIRE page content including header should be in Client Component?
                     OR: Just the "Add Tournament" button is a client component `<AddTournamentButton />`?
                     
                     I will refactor: `EventsClient` will wrap the *list*, but I need the Modal trigger.
                     Let's make `EventsPage` (Server) pass the data to `EventsClient`, and `EventsClient` renders the WHOLE UI including Header.
                     This replaces the static header in `page.tsx`.
                 */}
            </header>

            {/* Actually, let's just make EventsClient render everything *under* the top level div, including the sticky header. */}

            <header className="bg-white shadow-sm sticky top-0 z-50 px-3 py-3 mb-6">
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
                            Add Event
                        </button>
                    </div>
                </div>
            </header>

            <main className="px-3 space-y-4">
                {initialEvents.length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-lg">
                        No upcoming events found. Add one to get started!
                    </div>
                )}

                {initialEvents.map((event) => (
                    <div key={event.id} className="bg-white border-2 border-gray-400 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                        <div className="space-y-1">
                            <h3 className="font-bold text-[15pt] text-black">{event.name}</h3>
                            <div className="flex items-center gap-2 text-gray-600 text-[12pt]">
                                <span className="text-gray-400">📅</span>
                                <span>{event.date}</span>
                                {event.location && <span className="text-gray-400 text-sm ml-2">📍 {event.location}</span>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Only Delete Button */}
                            <button
                                onClick={() => handleDeleteEvent(event.id)}
                                disabled={isPending}
                                className="p-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
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
                                disabled={isPending}
                                className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-50"
                            >
                                {isPending ? 'Saving...' : 'Save Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
