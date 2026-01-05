import { prisma } from '@/lib/prisma';
import LiveScoreClient from './LiveScoreClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function LiveScorePage(props: { searchParams: Promise<{ roundId?: string }> }) {
    const resolvedSearchParams = await props.searchParams;
    const roundIdFromUrl = resolvedSearchParams.roundId;

    // 1. Get default course
    let defaultCourse = await prisma.course.findFirst({
        where: { name: 'City Park North' },
        include: {
            tee_boxes: true,
            holes: { orderBy: { hole_number: 'asc' } }
        }
    });

    if (!defaultCourse) {
        defaultCourse = await prisma.course.findFirst({
            include: { tee_boxes: true, holes: { orderBy: { hole_number: 'asc' } } }
        });
    }

    // 2. Resolve Today's Date (Chicago)
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const todayStr = formatter.format(new Date()); // YYYY-MM-DD

    console.log('LOG-1: Page Start');
    console.log('LOG-2: Today is', todayStr);
    console.log('LOG-3: URL ID is', roundIdFromUrl);

    let activeRound = null;

    // 3. Priority A: Load from URL
    if (roundIdFromUrl) {
        activeRound = await prisma.liveRound.findUnique({
            where: { id: roundIdFromUrl },
            include: {
                players: {
                    include: {
                        player: true,
                        scores: { include: { hole: true } }
                    }
                }
            }
        });
        if (activeRound) console.log('LOG-4: Loaded URL round:', activeRound.name);
    }

    // 4. Priority B: Load/Create Today's Round
    if (!activeRound) {
        console.log('LOG-5: No valid URL ID, checking DB for', todayStr);
        activeRound = await prisma.liveRound.findFirst({
            where: { date: todayStr },
            include: {
                players: {
                    include: {
                        player: true,
                        scores: { include: { hole: true } }
                    }
                }
            }
        });

        if (activeRound) {
            console.log('LOG-6: Found existing today round:', activeRound.id);
        } else if (defaultCourse) {
            console.log('LOG-7: Today round missing. Attempting CREATE...');
            try {
                activeRound = await prisma.liveRound.create({
                    data: {
                        name: `Live Round - ${todayStr}`,
                        date: todayStr,
                        course_id: defaultCourse.id
                        // Note: par, rating, slope temporarily removed to fix stale client crash. 
                        // Will default to schema values (72/113) until server restart.
                    } as any,
                    include: {
                        players: {
                            include: {
                                player: true,
                                scores: { include: { hole: true } }
                            }
                        }
                    }
                });
                console.log('LOG-8: CREATE SUCCESS:', activeRound.id);
            } catch (err: any) {
                console.log('LOG-9: CREATE FAILED!', err.message);
                // Race condition check
                activeRound = await prisma.liveRound.findFirst({
                    where: { date: todayStr },
                    include: {
                        players: {
                            include: {
                                player: true,
                                scores: { include: { hole: true } }
                            }
                        }
                    }
                });
                if (activeRound) console.log('LOG-10: Found after catch');
            }
        }
    }

    // 5. Final Fallback
    if (!activeRound) {
        console.log('LOG-11: Still no round. Falling back to latest in DB.');
        activeRound = await prisma.liveRound.findFirst({
            orderBy: { created_at: 'desc' },
            include: {
                players: {
                    include: {
                        player: true,
                        scores: { include: { hole: true } }
                    }
                }
            }
        });
        if (activeRound) console.log('LOG-12: Fallback to:', activeRound.name, activeRound.date);
    }

    // 6. Redirect to ensure ID is in URL
    if (!roundIdFromUrl && activeRound) {
        console.log('LOG-13: Redirecting to', activeRound.id);
        return redirect(`/live?roundId=${activeRound.id}`);
    }

    // 7. Get rounds for list
    const allLiveRounds = await prisma.liveRound.findMany({
        orderBy: { created_at: 'desc' },
        select: { id: true, name: true, date: true, created_at: true }
    });

    console.log('LOG-14: Rendering Client with', activeRound?.name);

    return (
        <LiveScoreClient
            allPlayers={await prisma.player.findMany({
                orderBy: { name: 'asc' },
                select: { id: true, name: true, index: true, preferred_tee_box: true }
            })}
            defaultCourse={defaultCourse}
            initialRound={activeRound}
            allLiveRounds={allLiveRounds}
        />
    );
}
