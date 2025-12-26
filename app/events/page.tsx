import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { format } from 'date-fns';
import EventsClient from './EventsClient';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
    // Fetch upcoming tournaments (or all tournaments sorted by date descending/ascending)
    // We'll show all future tournaments ascending, or maybe recent past + future?
    // User image implied a list of future events. Let's fetch all Rounds marked as tournaments.

    const eventsList = await prisma.event.findMany({
        orderBy: {
            date: 'asc'
        }
    });

    // Transform to Event format expected by Client
    const events = eventsList.map(t => ({
        id: t.id,
        name: t.name,
        date: format(new Date(t.date), 'EEEE, MMMM d, yyyy'),
        rawDate: t.date,
        location: t.location || 'City Park Golf Course'
    }));

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* We delegate the interactive list and modal to the Client Component */}
            <EventsClient initialEvents={events} />
        </div>
    );
}
