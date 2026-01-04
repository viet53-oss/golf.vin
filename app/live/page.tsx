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
            },
            players: {
                include: {
                    scores: true
                }
            }
        }
    });

    // Get all courses (for round creation)
    const courses = await prisma.course.findMany({
        orderBy: { name: 'asc' },
        include: {
            holes: {
                orderBy: { hole_number: 'asc' }
            }
        }
    });

    return (
        <LiveScoreClient
            rounds={rounds}
            allPlayers={allPlayers}
            courses={courses}
            isAdmin={isAdmin}
        />
    );
}
