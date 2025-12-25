import { prisma } from '@/lib/prisma';
import PlayersClient from './PlayersClient';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
    const playersRaw = await prisma.player.findMany({
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
    const course = await prisma.course.findFirst({
        include: { tee_boxes: true, holes: true }
    });

    // Sort by Last Name (Assuming "First Last" format)
    const players = playersRaw.sort((a, b) => {
        const lastNameA = a.name.split(' ').slice(1).join(' ');
        const lastNameB = b.name.split(' ').slice(1).join(' ');
        return lastNameA.localeCompare(lastNameB);
    });

    return <PlayersClient initialPlayers={players} course={course} />;
}
