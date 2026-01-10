import { prisma } from '@/lib/prisma';
import EditRoundForm from '@/components/EditRoundForm';
import Link from 'next/link';

export default async function NewRoundPage() {
    // 1. Get default course (needed for the form structure)
    const defaultCourse = await prisma.course.findFirst({
        include: {
            holes: true,
            tee_boxes: true
        }
    });

    if (!defaultCourse) {
        return <div className="p-8">No courses found. Please create a course first.</div>;
    }

    // 2. Create a "stub" round object that matches the RoundData type
    const now = new Date();
    // Adjust to local date string YYYY-MM-DD
    const localIsoDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const stubRound = {
        id: 'new',
        date: localIsoDate,
        name: '',
        is_tournament: false,
        course: {
            id: defaultCourse.id,
            name: defaultCourse.name,
            holes: defaultCourse.holes,
            tee_boxes: defaultCourse.tee_boxes
        },
        players: []
    };

    // 3. Get all players
    const allPlayers = await prisma.player.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            <header className="bg-white shadow-sm sticky top-0 z-10 px-1 py-3">
                <div className="flex items-center justify-end p-1">
                    <Link href="/scores" className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95">Home</Link>
                </div>
            </header>

            <main className="px-1 py-6">
                <EditRoundForm round={stubRound as any} allPlayers={allPlayers} />
            </main>
        </div>
    );
}
