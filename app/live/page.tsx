import { prisma } from '@/lib/prisma';
import LiveScoreClient from './LiveScoreClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function LiveScorePage() {
    // Get default course (City Park North)
    const defaultCourse = await prisma.course.findFirst({
        where: { name: 'City Park North' },
        include: {
            tee_boxes: true,
            holes: { orderBy: { hole_number: 'asc' } }
        }
    });

    // Get all players with tee preference
    const allPlayers = await prisma.player.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            index: true,
            preferred_tee_box: true
        }
    });

    // Get active live round (latest created)
    const activeRound = await prisma.liveRound.findFirst({
        orderBy: { created_at: 'desc' },
        include: {
            players: {
                include: {
                    player: true,
                    scores: {
                        include: {
                            hole: true
                        }
                    }
                }
            }
        }
    });

    return <LiveScoreClient allPlayers={allPlayers} defaultCourse={defaultCourse} initialRound={activeRound} />;
}
