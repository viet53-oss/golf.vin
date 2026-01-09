import { prisma } from '@/lib/prisma';
import PlayersClient from './PlayersClient';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds


export default async function PlayersPage() {
    let playersRaw: any[] = [];
    let course: any = null;

    try {
        // Optimized: Load only summary data, not all rounds with deep nesting
        playersRaw = await prisma.player.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                zip: true,
                preferred_tee_box: true,
                birthday: true,
                year_joined: true,
                index: true,
                low_handicap_index: true,
                created_at: true,
                // Only load essential round data for calculations
                rounds: {
                    select: {
                        id: true,
                        gross_score: true,
                        adjusted_gross_score: true,
                        front_nine: true,
                        back_nine: true,
                        index_at_time: true,
                        index_after: true,
                        points: true,
                        payout: true,
                        score_differential: true,
                        round: {
                            select: {
                                id: true,
                                date: true,
                                name: true,
                                is_tournament: true,
                                course: {
                                    select: {
                                        holes: {
                                            select: {
                                                par: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        tee_box: {
                            select: {
                                name: true,
                                slope: true,
                                rating: true
                            }
                        }
                    },
                    orderBy: {
                        round: {
                            date: 'desc'
                        }
                    }
                },
                manual_rounds: {
                    select: {
                        id: true,
                        date_played: true,
                        score_differential: true,
                        gross_score: true
                    },
                    orderBy: {
                        date_played: 'desc'
                    }
                }
            }
        });

        // Fetch Course Data for HCP Calculation (City Park North)
        course = await prisma.course.findFirst({
            where: {
                name: {
                    contains: 'North',
                    mode: 'insensitive'
                }
            },
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
