import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { format } from 'date-fns';
import ScheduleClient from './ScheduleClient';
import { parseLocalDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
    const eventsList = await prisma.event.findMany({
        orderBy: {
            date: 'asc'
        }
    });

    // Transform to Event format expected by Client
    const events = eventsList.map(t => ({
        id: t.id,
        name: t.name,
        date: format(parseLocalDate(t.date), 'EEEE, MMMM d, yyyy'),
        rawDate: t.date,
        location: t.location || ''
    }));

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* We delegate the interactive list and modal to the Client Component */}
            <ScheduleClient initialEvents={events} />
        </div>
    );
}
