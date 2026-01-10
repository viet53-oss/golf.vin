import { prisma } from '@/lib/prisma';
import EditRoundForm from '@/components/EditRoundForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EditRoundPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const round = await prisma.round.findUnique({
        where: { id },
        include: {
            course: {
                include: {
                    holes: true,
                    tee_boxes: true
                }
            },
            players: {
                include: {
                    player: true,
                    tee_box: true,
                },
                orderBy: {
                    player: { name: 'asc' } // Sort loaded players by name
                }
            }
        }
    });

    if (!round) {
        notFound();
    }

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
                <EditRoundForm round={round} allPlayers={allPlayers} />
            </main>
        </div>
    );
}
