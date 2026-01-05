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
});
// YYYY-MM-DD
const y = formatter.formatToParts(new Date()).find(p => p.type === 'year')?.value;
const m = formatter.formatToParts(new Date()).find(p => p.type === 'month')?.value;
const d = formatter.formatToParts(new Date()).find(p => p.type === 'day')?.value;
const todayStr = `${y}-${m}-${d}`;

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
        // Found existing
    } else if (defaultCourse) {
        try {
            activeRound = await prisma.liveRound.create({
                data: {
                    name: `Live Round - ${todayStr}`,
                    date: todayStr,
                    course_id: defaultCourse.id,
                    par: 68,
                    rating: 63.8,
                    slope: 100
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
    return redirect(`/live?roundId=${activeRound.id}`);
}

// 7. Get rounds for list
const allLiveRounds = await prisma.liveRound.findMany({
    orderBy: { created_at: 'desc' },
    select: { id: true, name: true, date: true, created_at: true }
});

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
