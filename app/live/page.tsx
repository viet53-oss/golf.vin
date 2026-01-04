import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import LiveScoreClient from './LiveScoreClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LiveScorePage() {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    // Get all players in the club for selection
    const allPlayers = await prisma.player.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });

    // Get all rounds (for selection)
    const rounds = await prisma.round.findMany({
        orderBy: { date: 'desc' },
        include: {
            course: {
                include: {
                    holes: {
                        orderBy: { hole_number: 'asc' }
                    }
                }
            }
        }
    });

    if (rounds.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">🔴 Live Scores</h1>
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <p className="text-gray-600 text-lg">No rounds found. Please create a round first!</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <LiveScoreClient
            rounds={rounds}
            allPlayers={allPlayers}
            isAdmin={isAdmin}
        />
    );
}
