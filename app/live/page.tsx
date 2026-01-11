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
            tee_boxes: true,
            holes: { include: { elements: true }, orderBy: { hole_number: 'asc' } }
        }
    });

    if (!defaultCourse) {
        defaultCourse = await prisma.course.findFirst({
            include: { tee_boxes: true, holes: { include: { elements: true }, orderBy: { hole_number: 'asc' } } }
        });
    }

    // 1b. Get ALL courses for selection
    const allCourses = await prisma.course.findMany({
        include: {
            tee_boxes: true,
            holes: { include: { elements: true }, orderBy: { hole_number: 'asc' } }
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
            orderBy: { created_at: 'desc' }, // Get the most recent round for today
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
                const whiteTee = defaultCourse.tee_boxes.find(t => t.name.toLowerCase().includes('white'));
                const defaultTeeBox = whiteTee || defaultCourse.tee_boxes[0];

                activeRound = await prisma.liveRound.create({
                    data: {
                        name: `Live Round - ${todayStr}`,
                        date: todayStr,
                        course_id: defaultCourse.id,
                        course_name: defaultCourse.name,
                        par: coursePar,
                        rating: defaultTeeBox?.rating ?? coursePar,
                        slope: defaultTeeBox?.slope ?? 113
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


    // 5. Final Fallback (Admin only for old rounds)
    if (!activeRound) {
        console.log('LOG-11: Still no round. Falling back to latest in DB.');

        // For non-admin users, only allow today's rounds
        if (!isAdmin) {
            console.log('LOG-11b: Non-admin user, no round for today. Redirecting to home.');
            return redirect('/');
        }

        // Admin users can access old rounds
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

    // 6. If still no round exists, redirect to home
    if (!activeRound) {
        console.log('LOG-13: No rounds exist. Redirecting to home.');
        return redirect('/');
    }

    // 7. Final safety check: Non-admin users should only see today's round
    if (!isAdmin && activeRound && activeRound.date !== todayStr) {
        console.log('LOG-13b: Non-admin user trying to access old round. Redirecting to today.');
        return redirect('/live');
    }

    // 8. Redirect to ensure ID is in URL
    if (!roundIdFromUrl && activeRound) {
        return redirect(`/live?roundId=${activeRound.id}`);
    }

    // 9. If activeRound has a specific course_id, use that as the defaultCourse
    if (activeRound?.course_id) {
        const roundCourse = await prisma.course.findUnique({
            where: { id: activeRound.course_id },
            include: {
                tee_boxes: true,
                holes: { include: { elements: true }, orderBy: { hole_number: 'asc' } }
            }
        });
        if (roundCourse) {
            defaultCourse = roundCourse;
        }
    }

    // 10. Get rounds for list
    const allLiveRounds = await prisma.liveRound.findMany({
        where: isAdmin ? {} : { date: todayStr },
        orderBy: { created_at: 'desc' },
        select: { id: true, name: true, date: true, created_at: true }
    });

    return (
        <LiveScoreClient
            allPlayers={await prisma.player.findMany({
                orderBy: { name: 'asc' },
                select: { id: true, name: true, index: true, preferred_tee_box: true }
            })}
            defaultCourse={defaultCourse ? JSON.parse(JSON.stringify(defaultCourse)) : null}
            allCourses={JSON.parse(JSON.stringify(allCourses))}
            initialRound={activeRound ? JSON.parse(JSON.stringify(activeRound)) : null}
            todayStr={todayStr}
            allLiveRounds={allLiveRounds.map(r => ({ ...r, created_at: r.created_at.toISOString() }))}
        />
    );
}
