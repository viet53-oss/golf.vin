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
                // address/city/state/zip/year_joined removed
                birthday: true,
                handicapIndex: true, // was index
                // low_handicap_index: true, // Removed
                createdAt: true,
                // Only load essential round data for calculations
                rounds: {
                    select: {
                        id: true,
                        grossScore: true,
                        netScore: true, // was adjusted_gross_score
                        frontNine: true,
                        backNine: true,
                        // handicapIndex removed (snapshot missing)
                        // points removed
                        // payout removed
                        // scoreDifferential removed
                        round: {
                            select: {
                                id: true,
                                date: true,
                                name: true,
                                isTournament: true,
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
                        teeBox: {
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
                // manual_rounds removed
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
            include: { teeBoxes: true, holes: true }
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
