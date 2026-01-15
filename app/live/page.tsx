import { prisma } from '@/lib/prisma';
import LiveScoreClient from './LiveScoreClient';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function LiveScorePage(props: { searchParams: Promise<{ roundId?: string }> }) {
    const resolvedSearchParams = await props.searchParams;
    const roundIdFromUrl = resolvedSearchParams.roundId;

    // Check if user is admin
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    // 1. Get default course
    let defaultCourse = await prisma.course.findFirst({
        where: { name: { contains: 'City Park North' } },
        include: {
            teeBoxes: true,
            holes: { orderBy: { holeNumber: 'asc' } }
        }
    });

    if (!defaultCourse) {
        defaultCourse = await prisma.course.findFirst({
            include: { teeBoxes: true, holes: { orderBy: { holeNumber: 'asc' } } }
        });
    }

    // 1b. Get ALL courses for selection
    const allCourses = await prisma.course.findMany({
        include: {
            teeBoxes: true,
            holes: { orderBy: { holeNumber: 'asc' } }
        },
        orderBy: { name: 'asc' }
    });

    // 2. Resolve Today's Date (Chicago)
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const todayStr = formatter.format(new Date()); // Returns YYYY-MM-DD

    let activeRound = null;

    // 3. Priority A: Load from URL (Admin only for old rounds)
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

        // If non-admin user tries to access an old round, redirect to today's round
        if (activeRound && !isAdmin && activeRound.date !== todayStr) {
            redirect('/live');
        }

        if (activeRound) console.log('LOG-4: Loaded URL round:', activeRound.name);
    }

    // 4. Priority B: Load/Create Today's Round
    if (!activeRound) {
        activeRound = await prisma.liveRound.findFirst({
            where: { date: todayStr },
            orderBy: { createdAt: 'desc' }, // Get the most recent round for today
            include: {
                players: {
                    include: {
                        player: true,
                        scores: { include: { hole: true } }
                    }
                }
            }
        });

        if (!activeRound && defaultCourse) {
            try {
                // Calculate par from holes
                const coursePar = defaultCourse.holes.reduce((sum, hole) => sum + hole.par, 0);

                // Find White tee box or fallback to first available
                const whiteTee = defaultCourse.teeBoxes.find(t => t.name.toLowerCase().includes('white'));
                const defaultTeeBox = whiteTee || defaultCourse.teeBoxes[0];

                activeRound = await prisma.liveRound.create({
                    data: {
                        name: `Live Round - ${todayStr}`,
                        date: todayStr,
                        courseId: defaultCourse.id,
                        courseName: defaultCourse.name
                    },
                    include: {
                        players: {
                            include: {
                                player: true,
                                scores: { include: { hole: true } }
                            }
                        }
                    }
                });
            } catch (err: any) {
                console.error('Error creating daily round:', err);
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
            }
        }
    }




    // 5. Final Fallback - Load most recent round if no round for today
    if (!activeRound) {
        console.log('LOG-11: Still no round. Falling back to latest in DB.');

        // Load the most recent round (any user can view)
        activeRound = await prisma.liveRound.findFirst({
            orderBy: { createdAt: 'desc' },
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

    // 6. If still no round exists, show empty state (don't redirect)
    // The LiveScoreClient component will handle the empty state



    if (!roundIdFromUrl && activeRound) {
        return redirect(`/live?roundId=${activeRound.id}`);
    }

    // 9. If activeRound has a specific course_id, use that as the defaultCourse
    if (activeRound?.courseId) {
        const roundCourse = await prisma.course.findUnique({
            where: { id: activeRound.courseId },
            include: {
                teeBoxes: true,
                holes: { orderBy: { holeNumber: 'asc' } }
            }
        });
        if (roundCourse) {
            defaultCourse = roundCourse;
        }
    }

    // 10. Get rounds for list
    const allLiveRounds = await prisma.liveRound.findMany({
        where: isAdmin ? {} : { date: todayStr },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            date: true,
            createdAt: true,
            players: {
                select: {
                    playerId: true,
                    guestName: true,
                    isGuest: true,
                    // We might need to match against selectedPlayers (which uses IDs)
                    // Regular players use playerId (matches Player.id)
                    // Guest players use guestName or we can just check if the ID matches the LiveRoundPlayer ID? 
                    // SelectedPlayers stores: { id: string }
                    // Regular player: id = Player.id
                    // Guest player: id = LiveRoundPlayer.id
                    id: true
                }
            }
        }
    });

    return (
        <LiveScoreClient
            allPlayers={(await prisma.player.findMany({
                orderBy: { name: 'asc' },
                select: { id: true, name: true, handicapIndex: true }
            })).map(p => ({
                id: p.id,
                name: p.name,
                index: p.handicapIndex ?? 0,
                preferredTeeBox: null
            }))}
            defaultCourse={defaultCourse ? JSON.parse(JSON.stringify(defaultCourse)) : null}
            allCourses={JSON.parse(JSON.stringify(allCourses))}
            initialRound={activeRound ? JSON.parse(JSON.stringify(activeRound)) : null}
            todayStr={todayStr}
            allLiveRounds={allLiveRounds.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        />
    );
}
