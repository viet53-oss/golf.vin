import { prisma } from '@/lib/prisma';
import PlayersClient from './PlayersClient';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
    let playersRaw: any[] = [];
    let course: any = null;

    try {
        playersRaw = await prisma.player.findMany({
            include: {
                rounds: {
                    include: {
                        round: {
                            include: {
                                course: {
                                    include: { holes: true }
                                },
                                players: {
                                    include: {
                                        player: true,
                                        tee_box: true
                                    }
                                }
                            }
                        },
                        tee_box: true,
                    },
                },
                manual_rounds: true,
            },
        });

        // Fetch Course Data for HCP Calculation
        course = await prisma.course.findFirst({
            include: { tee_boxes: true, holes: true }
        });
    } catch (error) {
        console.error("Failed to fetch players data:", error);
    }

    // Sort by Last Name (Assuming "First Last" format)
    const players = playersRaw.sort((a: any, b: any) => {
        const lastNameA = a.name.split(' ').slice(1).join(' ');
        const lastNameB = b.name.split(' ').slice(1).join(' ');
        return lastNameA.localeCompare(lastNameB);
    });

    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    return <PlayersClient initialPlayers={players} course={course} isAdmin={isAdmin} />;
}
