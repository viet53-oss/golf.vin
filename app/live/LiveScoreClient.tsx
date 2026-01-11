'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { LivePlayerSelectionModal } from '@/components/LivePlayerSelectionModal';
import { LiveRoundModal } from '@/components/LiveRoundModal';
import { GuestPlayerModal } from '@/components/GuestPlayerModal';
import ConfirmModal from '@/components/ConfirmModal';
import AddToClubModal from '@/components/AddToClubModal';
import { createLiveRound, addPlayerToLiveRound, saveLiveScore, deleteLiveRound, addGuestToLiveRound, updateGuestInLiveRound, deleteGuestFromLiveRound, createDefaultLiveRound } from '@/app/actions/create-live-round';
import { copyLiveToClub } from '@/app/actions/copy-live-to-club';

interface Player {
    id: string;
    name: string;
    index: number;
    preferred_tee_box: string | null;
    isGuest?: boolean;
    liveRoundPlayerId?: string; // LiveRoundPlayer ID for server actions
    liveRoundData?: {
        tee_box_name: string | null;
        course_hcp: number | null;
    } | null;
}

interface Hole {
    hole_number: number;
    par: number;
    difficulty?: number | null;
    latitude?: number | null;
    longitude?: number | null;
}

interface Course {
    id: string;
    name: string;
    tee_boxes: {
        id: string;
        name: string;
        rating: number;
        slope: number;
    }[];
    holes: Hole[];
}

interface LiveScoreClientProps {
    allPlayers: Player[];
    defaultCourse: Course | null;
    initialRound?: any;
    todayStr: string; // Pass from server to avoid hydration mismatch
    allLiveRounds: Array<{
        id: string;
        name: string;
        date: string;
        created_at: string;
    }>;
    allCourses: Course[];
}

export default function LiveScoreClient({ allPlayers, defaultCourse, initialRound, todayStr, allLiveRounds, allCourses }: LiveScoreClientProps) {
    const router = useRouter();
    // Initialize State from Server Data
    const [liveRoundId, setLiveRoundId] = useState<string | null>(initialRound?.id || null);

    // Start with empty selection - each device manages its own group
    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);

    const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
    const [roundModalMode, setRoundModalMode] = useState<'new' | 'edit'>('new');
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const [guestPlayers, setGuestPlayers] = useState<Player[]>([]);
    const [editingGuest, setEditingGuest] = useState<{ id: string; name: string; index: number; courseHandicap: number } | null>(null);
    const [isAddToClubModalOpen, setIsAddToClubModalOpen] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [birdiePlayers, setBirdiePlayers] = useState<Array<{ name: string; totalBirdies: number }>>([]);
    const [eaglePlayers, setEaglePlayers] = useState<Array<{ name: string; totalEagles: number }>>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    // Track pending (unsaved) scores for the current hole only
    const [pendingScores, setPendingScores] = useState<Map<string, number>>(new Map());
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    } | null>(null);

    // GPS Logic with fallback for desktop
    useEffect(() => {
        if (!navigator.geolocation) return;

        let watchId: number | null = null;
        let hasGotLocation = false;

        // First, try to get an initial position with fallback strategy
        const getInitialPosition = () => {
            // Try high accuracy first (for mobile with GPS)
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    hasGotLocation = true;
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });

                    // Start watching with high accuracy
                    watchId = navigator.geolocation.watchPosition(
                        (position) => {
                            setUserLocation({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            });
                        },
                        (error) => {
                            console.warn("GPS watch error:", error.message);
                        },
                        { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
                    );
                },
                (error) => {
                    // High accuracy failed, try low accuracy (for desktop)
                    console.warn("High accuracy GPS failed, trying low accuracy:", error.message);

                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            hasGotLocation = true;
                            setUserLocation({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            });

                            // Start watching with low accuracy
                            watchId = navigator.geolocation.watchPosition(
                                (position) => {
                                    setUserLocation({
                                        latitude: position.coords.latitude,
                                        longitude: position.coords.longitude
                                    });
                                },
                                (error) => {
                                    console.warn("GPS watch error:", error.message);
                                },
                                { enableHighAccuracy: false, timeout: 60000, maximumAge: 30000 }
                            );
                        },
                        (error) => {
                            console.error("GPS location unavailable:", error.message);
                        },
                        { enableHighAccuracy: false, timeout: 60000, maximumAge: 30000 }
                    );
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
        };

        getInitialPosition();

        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, []);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const d = R * c; // in metres
        return Math.round(d * 1.09361); // convert to yards
    };

    // Load saved group from localStorage after mount to avoid hydration mismatch
    useEffect(() => {
        try {
            const savedRoundId = localStorage.getItem('live_scoring_last_round_id');
            const currentId = initialRound?.id;

            // If we are on a different round than before, clear the old group selection
            if (currentId && savedRoundId && savedRoundId !== currentId) {
                localStorage.removeItem('live_scoring_my_group');
                localStorage.removeItem('live_scoring_guest_players');
                localStorage.setItem('live_scoring_last_round_id', currentId);
                setSelectedPlayers([]); // Clear selection for new round
                setGuestPlayers([]); // Clear guest players
                return;
            }

            if (currentId) {
                localStorage.setItem('live_scoring_last_round_id', currentId);
            }

            // Load guest players from database
            const guestsFromDb: Player[] = [];
            if (initialRound?.players) {
                initialRound.players.forEach((p: any) => {
                    if (p.is_guest) {
                        guestsFromDb.push({
                            id: p.id, // Use LiveRoundPlayer ID
                            name: p.guest_name || 'Guest',
                            index: p.index_at_time,
                            preferred_tee_box: null,
                            isGuest: true,
                            liveRoundData: {
                                tee_box_name: p.tee_box_name,
                                course_hcp: p.course_handicap
                            }
                        });
                    }
                });
            }
            setGuestPlayers(guestsFromDb);

            // Restore selected players (both regular and guests from database)
            const saved = localStorage.getItem('live_scoring_my_group');
            if (saved) {
                const savedIds = JSON.parse(saved);
                // Combine allPlayers with guest players from database
                const allAvailablePlayers = [...allPlayers, ...guestsFromDb];
                const restored = allAvailablePlayers.filter((p: Player) => savedIds.includes(p.id));
                if (restored.length > 0) {
                    setSelectedPlayers(restored);
                } else {
                    setSelectedPlayers([]); // Clear if no valid players found
                }
            } else {
                setSelectedPlayers([]); // No saved data, start empty
            }
        } catch (e) {
            console.error("Failed to load saved players", e);
            setSelectedPlayers([]); // On error, start empty
            setGuestPlayers([]); // On error, clear guests
        }
    }, [initialRound, allPlayers]);

    const [scores, setScores] = useState<Map<string, Map<number, number>>>(() => {
        const initialMap = new Map();
        if (initialRound?.players) {
            initialRound.players.forEach((p: any) => {
                const playerScores = new Map<number, number>();
                if (p.scores) {
                    p.scores.forEach((s: any) => {
                        if (s.hole?.hole_number) {
                            playerScores.set(s.hole.hole_number, s.strokes);
                        }
                    });
                }
                // Use LiveRoundPlayer ID for guests, player.id for regular players
                const playerId = p.is_guest ? p.id : p.player.id;
                initialMap.set(playerId, playerScores);
            });
        }
        return initialMap;
    });




    // Sync local scores with server data when it updates (e.g. after refresh)
    useEffect(() => {
        if (initialRound?.players) {
            setScores(prev => {
                const next = new Map(prev);
                initialRound.players.forEach((p: any) => {
                    // Reconstruct server scores for this player
                    const serverPlayerScores = new Map<number, number>();
                    if (p.scores) {
                        p.scores.forEach((s: any) => {
                            if (s.hole?.hole_number) {
                                serverPlayerScores.set(s.hole.hole_number, s.strokes);
                            }
                        });
                    }
                    // Update local map with server data
                    // Use LiveRoundPlayer ID for guests, player.id for regular players
                    const playerId = p.is_guest ? p.id : p.player.id;
                    next.set(playerId, serverPlayerScores);
                });
                return next;
            });
        }
    }, [initialRound]);


    // Polling for updates (every 10 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 10000);
        return () => clearInterval(interval);
    }, [router]);

    // Global Score Watcher (Birdies & Eagles)
    const knownBirdiesRef = useRef<Map<string, Set<number>>>(new Map());
    const knownEaglesRef = useRef<Map<string, Set<number>>>(new Map());
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        if (!initialRound?.players || !defaultCourse) return;

        const newBirdies: { name: string; totalBirdies: number }[] = [];
        const newEagles: { name: string; totalEagles: number }[] = [];

        initialRound.players.forEach((p: any) => {
            const playerId = p.is_guest ? p.id : p.player.id;

            // Init Birdie Ref
            if (!knownBirdiesRef.current.has(playerId)) knownBirdiesRef.current.set(playerId, new Set());

            // Init Eagle Ref
            if (!knownEaglesRef.current.has(playerId)) knownEaglesRef.current.set(playerId, new Set());
            const playerEagleSet = knownEaglesRef.current.get(playerId)!;
            const playerKnownSet = knownBirdiesRef.current.get(playerId)!;
            let playerHasNewBirdie = false;
            let playerHasNewEagle = false;

            if (p.scores) {
                p.scores.forEach((s: any) => {
                    if (s.hole?.hole_number && s.strokes) {
                        const hole = defaultCourse.holes.find(h => h.hole_number === s.hole.hole_number);
                        if (hole) {
                            const diff = s.strokes - hole.par;

                            // Birdie Check
                            if (diff === -1) {
                                if (!playerKnownSet.has(s.hole.hole_number)) {
                                    playerKnownSet.add(s.hole.hole_number);
                                    if (hasInitializedRef.current) playerHasNewBirdie = true;
                                }
                            }

                            // Eagle Check
                            if (diff <= -2) {
                                if (!playerEagleSet.has(s.hole.hole_number)) {
                                    playerEagleSet.add(s.hole.hole_number);
                                    if (hasInitializedRef.current) playerHasNewEagle = true;
                                }
                            }
                        }
                    }
                });
            }

            if (playerHasNewBirdie) {
                newBirdies.push({
                    name: p.is_guest ? (p.guest_name || 'Guest') : p.player.name,
                    totalBirdies: playerKnownSet.size
                });
            }
            if (playerHasNewEagle) {
                newEagles.push({
                    name: p.is_guest ? (p.guest_name || 'Guest') : p.player.name,
                    totalEagles: playerEagleSet.size
                });
            }
        });

        if (newBirdies.length > 0) {
            setBirdiePlayers(prev => {
                const existingNames = new Set(prev.map(x => x.name));
                const uniqueNew = newBirdies.filter(x => !existingNames.has(x.name));
                if (uniqueNew.length === 0) return prev;
                return [...prev, ...uniqueNew];
            });
        }

        if (newEagles.length > 0) {
            setEaglePlayers(prev => {
                const existingNames = new Set(prev.map(x => x.name));
                const uniqueNew = newEagles.filter(x => !existingNames.has(x.name));
                if (uniqueNew.length === 0) return prev;
                return [...prev, ...uniqueNew];
            });
        }

        hasInitializedRef.current = true;

    }, [initialRound, defaultCourse]);

    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const searchParams = useSearchParams();

    // Initialize activeHole from URL or calculate the first incomplete hole
    const [activeHole, setActiveHole] = useState(() => {
        const urlHole = searchParams.get('hole');
        if (urlHole) {
            const h = parseInt(urlHole);
            if (h >= 1 && h <= 18) return h;
        }

        if (!initialRound?.players || initialRound.players.length === 0) return 1;

        // Find the first hole that isn't fully completed by all participants
        for (let h = 1; h <= 18; h++) {
            const allPlayersHaveScore = initialRound.players.every((p: any) => {
                return p.scores && p.scores.some((s: any) => s.hole?.hole_number === h);
            });

            if (!allPlayersHaveScore) {
                return h;
            }
        }
        return 1;
    });

    // Sync activeHole to URL whenever it changes
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        params.set('hole', activeHole.toString());
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', newUrl);

        setHasUnsavedChanges(false);
        setPendingScores(new Map()); // Clear pending scores when changing holes
    }, [activeHole]);
    const [isAdmin, setIsAdmin] = useState(false);

    // Check admin status
    useEffect(() => {
        const checkAdmin = () => {
            const adminCookie = Cookies.get('admin_session');
            setIsAdmin(adminCookie === 'true');
        };

        checkAdmin();

        // Listen for admin status changes
        window.addEventListener('admin-change', checkAdmin);
        return () => window.removeEventListener('admin-change', checkAdmin);
    }, []);

    // Use todayStr from server to avoid hydration mismatch
    const roundDateStr = initialRound?.date || todayStr;
    const isLocked = todayStr > roundDateStr;
    const canUpdate = isAdmin || !isLocked;

    // Auto-select next available hole for the specific group - DISABLED to allow manual hole selection
    // useEffect(() => {
    //     if (selectedPlayers.length === 0) return;

    //     for (let h = 1; h <= 18; h++) {
    //         const allHaveScore = selectedPlayers.every(p => {
    //             const pScores = scores.get(p.id);
    //             return pScores && pScores.has(h);
    //         });
    //         if (!allHaveScore) {
    //             setActiveHole(h);
    //             return;
    //         }
    //     }
    // }, [selectedPlayers]); // Intentionally not including scores to avoid jumping while scoring

    const activeHolePar = defaultCourse?.holes.find(h => h.hole_number === activeHole)?.par || 4;
    const activeHoleDifficulty = defaultCourse?.holes.find(h => h.hole_number === activeHole)?.difficulty;

    // Helper to split name into first and last
    const splitName = (fullName: string) => {
        const parts = fullName.trim().split(' ');
        if (parts.length === 1) return { first: parts[0], last: '' };
        const last = parts[parts.length - 1];
        const first = parts.slice(0, -1).join(' ');
        return { first, last };
    };

    const getScore = (playerId: string, holeNumber: number): number | null => {
        // For the active hole, show pending score if it exists
        if (holeNumber === activeHole && pendingScores.has(playerId)) {
            return pendingScores.get(playerId) ?? null;
        }
        // Otherwise show saved score
        return scores.get(playerId)?.get(holeNumber) ?? null;
    };

    // Get only saved scores (no pending) - use this for summary/leaderboard
    const getSavedScore = (playerId: string, holeNumber: number): number | null => {
        return scores.get(playerId)?.get(holeNumber) ?? null;
    };

    const getPlayerTee = (player: Player) => {
        if (!defaultCourse) return null;

        // Only use player's preferred tee box for City Park North
        const isCityParkNorth = defaultCourse.name.toLowerCase().includes('city park north');

        if (isCityParkNorth && player.preferred_tee_box) {
            const match = defaultCourse.tee_boxes.find(t => t.name.toLowerCase() === player.preferred_tee_box?.toLowerCase());
            if (match) return match;
            const partial = defaultCourse.tee_boxes.find(t => t.name.toLowerCase().includes(player.preferred_tee_box!.toLowerCase()));
            if (partial) return partial;
        }

        // For other courses, or if no preference, use the round's tee box
        // Try to get from initialRound first (the selected tee for this round)
        if (initialRound?.rating && initialRound?.slope) {
            const roundTee = defaultCourse.tee_boxes.find(t =>
                t.rating === initialRound.rating && t.slope === initialRound.slope
            );
            if (roundTee) return roundTee;
        }

        // Fallback to White tee or first available
        const white = defaultCourse.tee_boxes.find(t => t.name.toLowerCase().includes('white'));
        return white || defaultCourse.tee_boxes[0];
    };

    const getCourseHandicap = (player: Player): number => {
        // Prefer server-side snapshot if available
        if (player.liveRoundData?.course_hcp !== undefined && player.liveRoundData.course_hcp !== null) {
            return player.liveRoundData.course_hcp;
        }

        const teeBox = getPlayerTee(player);
        if (!teeBox) return 0;

        const rating = initialRound?.rating ?? teeBox.rating;
        const slope = initialRound?.slope ?? teeBox.slope;
        const coursePar = initialRound?.par ?? (defaultCourse?.holes.reduce((sum, h) => sum + h.par, 0) || 72);

        const ch = (player.index * slope / 113) + (rating - coursePar);
        return Math.round(ch);
    };

    const handleAddGuest = async (guest: { name: string; index: number; courseHandicap: number }) => {
        if (!liveRoundId || !initialRound) {
            alert('No active live round found');
            return;
        }

        console.log('Adding guest to database:', guest);

        // Add guest to database
        const result = await addGuestToLiveRound({
            liveRoundId,
            guestName: guest.name,
            index: guest.index,
            courseHandicap: guest.courseHandicap,
            rating: initialRound.rating,
            slope: initialRound.slope,
            par: initialRound.par
        });

        if (result.success && result.guestPlayerId) {
            console.log('Guest added successfully, refreshing page');

            // Add to local storage so it appears in "My Group" after refresh
            const saved = localStorage.getItem('live_scoring_my_group');
            let currentIds: string[] = saved ? JSON.parse(saved) : [];
            if (!currentIds.includes(result.guestPlayerId)) {
                currentIds.push(result.guestPlayerId);
                localStorage.setItem('live_scoring_my_group', JSON.stringify(currentIds));
            }

            // Refresh the page to load the new guest
            router.refresh();
        } else {
            alert('Failed to add guest: ' + result.error);
        }
    };

    const handleUpdateGuest = async (guestId: string, guestData: { name: string; index: number; courseHandicap: number }) => {
        console.log('Updating guest in database:', guestId, guestData);

        const result = await updateGuestInLiveRound({
            guestPlayerId: guestId,
            guestName: guestData.name,
            index: guestData.index,
            courseHandicap: guestData.courseHandicap
        });

        if (result.success) {
            console.log('Guest updated successfully, refreshing page');
            setEditingGuest(null);
            router.refresh();
        } else {
            alert('Failed to update guest: ' + result.error);
        }
    };

    const handleDeleteGuest = async (guestId: string) => {
        console.log('Deleting guest from database:', guestId);

        const result = await deleteGuestFromLiveRound(guestId);

        if (result.success) {
            console.log('Guest deleted successfully, refreshing page');
            setIsGuestModalOpen(false);
            setEditingGuest(null);
            router.refresh();
        } else {
            alert('Failed to delete guest: ' + result.error);
        }
    };

    const handleCopyToClub = async (selectedPlayerIds: string[]) => {
        if (!liveRoundId) {
            alert('No live round selected');
            return;
        }

        const result = await copyLiveToClub({
            liveRoundId,
            playerIds: selectedPlayerIds
        });

        if (result.success) {
            alert(result.message || 'Successfully copied to club scores!');
        } else {
            alert('Failed to copy: ' + result.error);
        }
    };




    const handleAddPlayers = async (newSelectedPlayerIds: string[]) => {
        const newSelectedPlayers = allPlayers.filter(p => newSelectedPlayerIds.includes(p.id));
        const selectedGuests = guestPlayers.filter(p => newSelectedPlayerIds.includes(p.id));
        const combinedSelection = [...newSelectedPlayers, ...selectedGuests];

        setSelectedPlayers(combinedSelection);

        // 1. Ensure Live Round Exists (Auto-start or Auto-join)
        let currentLiveRoundId = liveRoundId;
        if (!currentLiveRoundId) {
            // Check if there is already a live round for today to join
            const existingRoundForToday = allLiveRounds.find(r => r.date === todayStr);

            if (existingRoundForToday) {
                console.log("Joining existing round:", existingRoundForToday.id);
                currentLiveRoundId = existingRoundForToday.id;
                setLiveRoundId(existingRoundForToday.id);
                // Update URL silently
                window.history.replaceState(null, '', `/live?roundId=${existingRoundForToday.id}`);
            } else {
                console.log("Starting new live round for today:", todayStr);
                const result = await createDefaultLiveRound(todayStr);

                if (result.success && result.roundId) {
                    currentLiveRoundId = result.roundId;
                    setLiveRoundId(result.roundId);
                    // Update URL silently
                    window.history.replaceState(null, '', `/live?roundId=${result.roundId}`);
                } else {
                    alert("Failed to start live round: " + result.error);
                    return;
                }
            }
        }

        // 2. Add New Players to DB
        for (const player of newSelectedPlayers) {
            const alreadyExistsInInitialRound = initialRound?.players?.some((p: any) => p.player?.id === player.id);
            const alreadyExistsInCurrentState = scores.has(player.id);

            if (!alreadyExistsInInitialRound && !alreadyExistsInCurrentState) {
                const teeBox = getPlayerTee(player);
                if (currentLiveRoundId && teeBox?.id) {
                    const addResult = await addPlayerToLiveRound({
                        liveRoundId: currentLiveRoundId,
                        playerId: player.id,
                        teeBoxId: teeBox.id
                    });

                    if (!addResult.success) {
                        console.error(`Failed to add player ${player.name}:`, addResult.error);
                    }
                }
            }
        }
    };

    const handleCreateNewRound = () => {
        setConfirmConfig({
            isOpen: true,
            title: 'Create New Round',
            message: 'Create a new live round for today?',
            isDestructive: false,
            onConfirm: async () => {
                setConfirmConfig(null);
                // Get today's date in Chicago time to match server logic
                const formatter = new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'America/Chicago',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                const today = formatter.format(new Date());

                const result = await createDefaultLiveRound(today);
                if (result.success && result.roundId) {
                    // Navigate to the new round
                    router.push(`/live?roundId=${result.roundId}`);
                    // Force a hard refresh to ensure state is clean
                    setTimeout(() => window.location.reload(), 100);
                } else {
                    alert('Failed to create new round: ' + (result.error || 'Unknown error'));
                }
            }
        });
    };

    const updateScore = (playerId: string, increment: boolean) => {
        if (!liveRoundId) {
            console.warn("No live round ID available to save score.");
            return;
        }

        // Get current score from pending if exists, otherwise from saved scores
        const savedScore = scores.get(playerId)?.get(activeHole);
        const currentScore = pendingScores.get(playerId) ?? savedScore ?? activeHolePar;

        let nextScore = increment ? currentScore + 1 : currentScore - 1;
        if (nextScore < 1) nextScore = 1;

        // Update pending scores only (don't update main scores state)
        setPendingScores(prev => {
            const newPending = new Map(prev);
            newPending.set(playerId, nextScore);
            return newPending;
        });

        // Mark as unsaved
        setHasUnsavedChanges(true);
    };

    // Standardize Persistence logic: 
    // 1. Initial Load (via useState initializer at top)
    // 2. Auto-save on change
    useEffect(() => {
        if (typeof window !== 'undefined' && selectedPlayers.length > 0) {
            localStorage.setItem('live_scoring_my_group', JSON.stringify(selectedPlayers.map(p => p.id)));
        }
    }, [selectedPlayers]);

    // SELF-HEALING SYNC: Ensure locally selected players are actually ON the server
    // This fixes the "missing players on other phones" issue by retrying the add if server state is stale
    useEffect(() => {
        if (!liveRoundId || selectedPlayers.length === 0) return;

        const syncMissingPlayers = async () => {
            const missingFromServer = selectedPlayers.filter(p => {
                // Ignore guests (handled separately)
                if (p.isGuest) return false;

                // Check if player is in the server-provided initialRound
                const existsOnServer = initialRound?.players?.some((rp: any) => rp.player?.id === p.id);
                return !existsOnServer;
            });

            if (missingFromServer.length > 0) {
                console.log("Found players missing from server (Ghost Players). Attempting repair:", missingFromServer.map(p => p.name));

                let restoredCount = 0;
                for (const p of missingFromServer) {
                    const teeBox = getPlayerTee(p);
                    if (teeBox && liveRoundId) {
                        const res = await addPlayerToLiveRound({
                            liveRoundId,
                            playerId: p.id,
                            teeBoxId: teeBox.id
                        });
                        if (res.success) restoredCount++;
                    }
                }

                if (restoredCount > 0) {
                    console.log(`Repaired ${restoredCount} ghost players. Refreshing...`);
                    router.refresh();
                }
            }
        };

        // Debounce check to avoid spamming while initialRound loads
        const timer = setTimeout(syncMissingPlayers, 3000);
        return () => clearTimeout(timer);
    }, [selectedPlayers, initialRound, liveRoundId]);

    // Calculate Summary Players (Union of Server State and Local Selection)
    // Create map from initialRound if available
    const summaryPlayersMap = new Map<string, Player>();
    if (initialRound?.players) {
        initialRound.players.forEach((p: any) => {
            if (p.is_guest) {
                // Handle guest players
                summaryPlayersMap.set(p.id, {
                    id: p.id,
                    name: p.guest_name || 'Guest',
                    index: p.index_at_time,
                    preferred_tee_box: null,
                    isGuest: true,
                    liveRoundPlayerId: p.id, // For guests, the ID is already the LiveRoundPlayer ID
                    liveRoundData: {
                        tee_box_name: p.tee_box_name,
                        course_hcp: p.course_handicap
                    }
                });
            } else {
                // Handle regular players
                summaryPlayersMap.set(p.player.id, {
                    id: p.player.id,
                    name: p.player.name,
                    index: p.player.index,
                    preferred_tee_box: p.player.preferred_tee_box,
                    liveRoundPlayerId: p.id, // Store the LiveRoundPlayer ID
                    liveRoundData: {
                        tee_box_name: p.tee_box_name,
                        course_hcp: p.course_handicap
                    }
                });
            }
        });
    }
    // Add any locally selected players
    selectedPlayers.forEach(p => {
        if (!summaryPlayersMap.has(p.id)) summaryPlayersMap.set(p.id, p);
    });
    const summaryPlayers = Array.from(summaryPlayersMap.values());

    // Calculate Leaderboard Data
    const rankedPlayers = summaryPlayers.map(player => {
        const playerScores = scores.get(player.id);
        let totalGross = 0;
        let front9 = 0;
        let back9 = 0;
        let strokesReceivedSoFar = 0;
        let parTotal = 0;
        let thru = 0;
        const courseHcp = getCourseHandicap(player);

        const grossHoleScores: { difficulty: number; grossScore: number }[] = [];

        if (playerScores) {
            playerScores.forEach((strokes, holeNum) => {
                totalGross += strokes;

                // Track front 9 and back 9
                if (holeNum <= 9) {
                    front9 += strokes;
                } else {
                    back9 += strokes;
                }

                const hole = defaultCourse?.holes.find(h => h.hole_number === holeNum);
                const holePar = hole?.par || 4;
                const difficulty = hole?.difficulty || holeNum;

                // Collect for tie breaker
                grossHoleScores.push({
                    difficulty,
                    grossScore: strokes
                });

                let holeStrokes = 0;
                if (courseHcp > 0) {
                    const base = Math.floor(courseHcp / 18);
                    const remainder = courseHcp % 18;
                    holeStrokes = base + (difficulty <= remainder ? 1 : 0);
                }
                strokesReceivedSoFar += holeStrokes;

                parTotal += holePar;
                thru++;
            });
        }

        // Sort gross scores by difficulty (1 is hardest) for tie-breaker
        grossHoleScores.sort((a, b) => a.difficulty - b.difficulty);

        const totalNet = totalGross - strokesReceivedSoFar;
        const toPar = totalGross - parTotal;

        return { ...player, totalGross, front9, back9, strokesReceivedSoFar, courseHcp, totalNet, thru, toPar, parTotal, grossHoleScores };
    }).sort((a, b) => {
        // Primary Sort: Total Net (Ascending)
        if (a.totalNet !== b.totalNet) return a.totalNet - b.totalNet;

        // Tie Breaker: Compare Gross Score on hardest holes (Difficulty 1, 2, 3...)
        const len = Math.min(a.grossHoleScores.length, b.grossHoleScores.length);
        for (let i = 0; i < len; i++) {
            if (a.grossHoleScores[i].grossScore !== b.grossHoleScores[i].grossScore) {
                return a.grossHoleScores[i].grossScore - b.grossHoleScores[i].grossScore;
            }
        }

        return 0;
    });

    const activePlayers = rankedPlayers.filter(p => p.thru > 0);
    const allActiveFinished = activePlayers.length > 0 && activePlayers.every(p => p.thru >= 18);
    const allPlayersFinished = rankedPlayers.length > 0 && rankedPlayers.every(p => p.thru >= 18);

    // Optimized: Check if ANY player in the round has completed hole 3
    // Use summaryPlayers to include both local selections and server data
    const anyPlayerCompletedHole3 = summaryPlayers.length > 0 && summaryPlayers.some(p => scores.get(p.id)?.has(3));

    // Hide Course and Group sections after hole 3 is completed by ANY player (except for admins)
    const hideCourseAndGroupSections = !isAdmin && anyPlayerCompletedHole3;

    // Calculate Stats (Birdies/Eagles) for Modal
    const playerStats = rankedPlayers.map(player => {
        const playerScores = scores.get(player.id);
        let birdieCount = 0;
        let eagleCount = 0;

        if (playerScores) {
            playerScores.forEach((strokes, holeNum) => {
                const hole = defaultCourse?.holes.find(h => h.hole_number === holeNum);
                const holePar = hole?.par || 4;
                const diff = strokes - holePar;
                if (diff === -1) birdieCount++;
                if (diff <= -2) eagleCount++;
            });
        }
        return { ...player, birdieCount, eagleCount };
    });

    const birdieLeaders = playerStats.filter(p => p.birdieCount > 0).sort((a, b) => b.birdieCount - a.birdieCount);
    const eagleLeaders = playerStats.filter(p => p.eagleCount > 0).sort((a, b) => b.eagleCount - a.eagleCount);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50 px-1 py-1">
                <div className="w-full flex justify-between items-center">
                    <h1 className="text-[18pt] font-bold text-green-700 tracking-tight flex-1 text-left ml-3">Live Scoring</h1>
                    <Link href="/" className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors">
                        Home
                    </Link>
                </div>
            </header>

            <main className="w-full px-1 pt-1 m-0 space-y-1">
                {/* Round Selector - Admin Only */}
                {isAdmin && allLiveRounds.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-1 border-4 border-gray-300">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[15pt] font-bold text-gray-900">Select Round:</label>
                            {isAdmin && (
                                <button
                                    onClick={handleCreateNewRound}
                                    className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                                >
                                    New Round
                                </button>
                            )}
                        </div>

                        <select
                            value={liveRoundId || ''}
                            onChange={(e) => {
                                if (e.target.value) {
                                    window.location.href = `/live?roundId=${e.target.value}`;
                                }
                            }}
                            className="flex-1 px-4 py-2 text-[15pt] border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-w-0"
                        >
                            <option value="">-- Select a Round --</option>
                            {allLiveRounds.map(round => (
                                <option key={round.id} value={round.id}>
                                    {round.name} - {new Date(round.date).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    </div>
                )}


                {/* Course Info Card */}
                {
                    !hideCourseAndGroupSections && (
                        <div className="bg-white rounded-xl shadow-lg p-1 border-4 border-gray-300">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-[15pt] font-bold text-gray-900">{defaultCourse?.name || 'Round'}</h2>
                                        {isLocked && (
                                            <span className="bg-red-100 text-red-700 text-[10pt] font-black px-2 py-0.5 rounded-full uppercase">Locked</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[15pt] text-gray-500 mt-1">
                                        <span>{initialRound?.date || todayStr}</span>
                                        <span>P:{initialRound?.par ?? defaultCourse?.holes.reduce((a, b) => a + b.par, 0)}</span>
                                        <span>R:{initialRound?.rating ?? defaultCourse?.tee_boxes[0]?.rating}</span>
                                        <span>S:{initialRound?.slope ?? defaultCourse?.tee_boxes[0]?.slope}</span>
                                        {(() => {
                                            // Find the tee box name based on rating and slope
                                            const teeBox = defaultCourse?.tee_boxes.find(t =>
                                                t.rating === (initialRound?.rating ?? defaultCourse?.tee_boxes[0]?.rating) &&
                                                t.slope === (initialRound?.slope ?? defaultCourse?.tee_boxes[0]?.slope)
                                            );
                                            const teeName = teeBox?.name || '';
                                            const teeIndicator = teeName.toLowerCase().includes('white') ? 'W'
                                                : teeName.toLowerCase().includes('gold') ? 'G'
                                                    : teeName.charAt(0).toUpperCase();
                                            return teeIndicator && <span className="px-2 py-0.5 rounded text-[12pt] font-bold bg-white text-black border border-black">{teeIndicator}</span>;
                                        })()}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0">

                                    {canUpdate && !hideCourseAndGroupSections && (
                                        <button
                                            onClick={() => {
                                                setRoundModalMode('edit');
                                                setIsRoundModalOpen(true);
                                            }}
                                            className="bg-black text-white text-[15pt] font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition-all shadow-md active:scale-95"
                                        >
                                            Course
                                        </button>
                                    )}

                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    if (!liveRoundId) return;
                                                    setConfirmConfig({
                                                        isOpen: true,
                                                        title: 'Delete Live Round',
                                                        message: 'Are you sure you want to delete this live round? This action cannot be undone.',
                                                        isDestructive: true,
                                                        onConfirm: async () => {
                                                            setConfirmConfig(null);
                                                            try {
                                                                await deleteLiveRound(liveRoundId);
                                                                window.location.href = '/';
                                                            } catch (err) {
                                                                console.error('Failed to delete round:', err);
                                                                alert('Failed to delete round.');
                                                            }
                                                        }
                                                    });
                                                }}
                                                className="bg-red-600 text-white text-[15pt] font-bold px-4 py-2 rounded-full hover:bg-red-700 transition-all shadow-md active:scale-95"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => setIsAddToClubModalOpen(true)}
                                                className="bg-green-600 text-white text-[15pt] font-bold px-4 py-2 rounded-full hover:bg-green-700 transition-all shadow-md active:scale-95"
                                            >
                                                Add to Club
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                <LiveRoundModal
                    isOpen={isRoundModalOpen}
                    onClose={() => setIsRoundModalOpen(false)}
                    courseId={defaultCourse?.id}
                    existingRound={roundModalMode === 'edit' ? initialRound : null}
                    allCourses={allCourses}
                />

                {/* Player Selection Modal */}
                <LivePlayerSelectionModal
                    isOpen={isPlayerModalOpen}
                    onClose={() => setIsPlayerModalOpen(false)}
                    allPlayers={[...allPlayers, ...guestPlayers]}
                    selectedIds={selectedPlayers.map(p => p.id)}
                    playersInRound={initialRound?.players?.map((p: any) => p.is_guest ? p.id : p.player.id) || []}
                    onSelectionChange={handleAddPlayers}
                    courseData={defaultCourse ? {
                        courseName: defaultCourse.name,
                        teeBoxes: defaultCourse.tee_boxes,
                        par: defaultCourse.holes.reduce((sum, h) => sum + h.par, 0),
                        roundTeeBox: initialRound ? {
                            rating: initialRound.rating,
                            slope: initialRound.slope
                        } : null
                    } : null}
                />

                <GuestPlayerModal
                    isOpen={isGuestModalOpen}
                    onClose={() => {
                        setIsGuestModalOpen(false);
                        setEditingGuest(null);
                    }}
                    onAdd={handleAddGuest}
                    onUpdate={handleUpdateGuest}
                    onDelete={handleDeleteGuest}
                    editingGuest={editingGuest}
                    roundData={initialRound ? {
                        rating: initialRound.rating,
                        slope: initialRound.slope,
                        par: initialRound.par
                    } : null}
                />

                {/* Scoring Section */}
                {/* GPS SECTION */}
                {
                    initialRound && (
                        <div className="bg-white rounded-xl shadow-lg border-2 border-black my-1 p-2">
                            <div className="flex justify-between items-center mb-1 border-b border-gray-100 pb-1">
                                <h2 className="text-[15pt] font-black text-gray-900 tracking-tight shrink-0">GPS</h2>
                                <h2 className="text-[18pt] font-bold text-gray-900 text-right truncate ml-2">{defaultCourse?.name}</h2>
                            </div>

                            {/* GPS Distance Display */}
                            {(() => {
                                const currentHole = defaultCourse?.holes.find(h => h.hole_number === activeHole);

                                if (!userLocation) {
                                    return (
                                        <div className="bg-gray-100 text-gray-500 py-6 rounded-[80px] border-2 border-dashed border-gray-300 text-center mb-2 shadow-inner">
                                            <p className="font-medium text-[15pt] animate-pulse">🛰️ Waiting for GPS...</p>
                                        </div>
                                    );
                                }

                                if (!currentHole?.latitude || !currentHole?.longitude) {
                                    return (
                                        <div className="bg-yellow-50 text-yellow-700 py-6 rounded-[80px] text-center mb-2 shadow-inner border-2 border-yellow-400">
                                            <p className="font-medium text-[15pt]">📍 Coordinates missing for Hole {activeHole}</p>
                                        </div>
                                    );
                                }

                                const dist = calculateDistance(
                                    userLocation.latitude,
                                    userLocation.longitude,
                                    Number(currentHole.latitude),
                                    Number(currentHole.longitude)
                                );

                                return (
                                    <div className="bg-green-600 text-white w-full mx-auto px-1 py-0 rounded-[100px] text-center mb-2 border-2 border-black shadow-inner relative overflow-hidden">
                                        <p className="font-black text-[115pt] leading-none flex items-center justify-center pt-3 pb-5">
                                            {dist}
                                        </p>
                                    </div>
                                );
                            })()}

                            <div className="grid grid-cols-6 gap-1">
                                {defaultCourse?.holes.map(hole => {
                                    // Check if this hole has been saved (has scores)
                                    const isSaved = selectedPlayers.some(p => {
                                        const pScores = scores.get(p.id);
                                        return pScores && pScores.has(hole.hole_number);
                                    });

                                    const isActive = activeHole === hole.hole_number;

                                    // Determine styling
                                    let btnClass = "bg-white text-black border border-black";
                                    if (isActive) {
                                        // Active hole: always white on blue (with or without data)
                                        btnClass = "bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1 z-10 scale-105 shadow-md";
                                    } else if (isSaved) {
                                        // Inactive saved holes: white on black
                                        btnClass = "bg-black text-white border border-black";
                                    }

                                    return (
                                        <button
                                            key={hole.hole_number}
                                            onClick={() => setActiveHole(hole.hole_number)}
                                            className={`
                                            flex flex-col items-center justify-center py-3 rounded-2xl transition-all
                                            ${btnClass}
                                        `}
                                        >
                                            <div className="flex items-baseline">
                                                <span className="text-[20pt] font-black leading-none">{hole.hole_number}</span>
                                                <span className="text-[15pt] font-bold leading-none opacity-80">/{hole.par}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )
                }

                {/* GROUP SECTION */}
                {
                    !hideCourseAndGroupSections && (selectedPlayers.length > 0 || canUpdate) && (
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 my-1 p-2">
                            <div className="flex justify-between items-center">
                                <h2 className="text-[15pt] font-black text-gray-900 tracking-tight">Group</h2>
                                {canUpdate && !hideCourseAndGroupSections && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsPlayerModalOpen(true)}
                                            className="bg-black text-white rounded-full px-4 py-2 text-[15pt] font-bold shadow hover:bg-gray-800 active:scale-95 transition-all"
                                        >
                                            Players
                                        </button>
                                        <button
                                            onClick={() => setIsGuestModalOpen(true)}
                                            className="bg-black text-white rounded-full px-4 py-2 text-[15pt] font-bold shadow hover:bg-gray-800 active:scale-95 transition-all"
                                        >
                                            Guest
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* PLAYERS SECTION (Scoring) */}
                {
                    selectedPlayers.length > 0 && (
                        <div className="bg-white rounded-xl shadow-lg border-2 border-black my-1 p-2">
                            <div className="flex justify-between items-center mb-1">
                                <h2 className="text-[14pt] font-black text-gray-900 tracking-tight">Players</h2>
                                {
                                    selectedPlayers.length > 0 && canUpdate && (
                                        <button
                                            onClick={async () => {
                                                if (!liveRoundId) return;

                                                const updates: { playerId: string; strokes: number }[] = [];
                                                const newScores = new Map(scores);

                                                // Check if this hole was already scored (for all players)
                                                const wasAlreadyScored = selectedPlayers.every(p => {
                                                    const playerScores = scores.get(p.id);
                                                    return playerScores && playerScores.has(activeHole);
                                                });

                                                // Check if anyone scored a birdie on this hole
                                                const birdiePlayerData: Array<{ name: string; totalBirdies: number }> = [];
                                                const eaglePlayerData: Array<{ name: string; totalEagles: number }> = [];
                                                const activeHolePar = defaultCourse?.holes.find(h => h.hole_number === activeHole)?.par || 4;

                                                selectedPlayers.forEach(p => {
                                                    const playerScores = new Map(newScores.get(p.id) || []);

                                                    // Use pending score if it exists, otherwise use saved score or par
                                                    const pendingScore = pendingScores.get(p.id);
                                                    const savedScore = playerScores.get(activeHole);
                                                    const finalScore = pendingScore ?? savedScore ?? activeHolePar;

                                                    // Update the score in the map
                                                    playerScores.set(activeHole, finalScore);
                                                    newScores.set(p.id, playerScores);

                                                    // Add to updates for server
                                                    updates.push({ playerId: p.id, strokes: finalScore });

                                                    // Check if this hole is a birdie
                                                    if (finalScore === activeHolePar - 1) {
                                                        // Register birdie locally to prevent global watcher duplicate trigger
                                                        if (!knownBirdiesRef.current.has(p.id)) {
                                                            knownBirdiesRef.current.set(p.id, new Set());
                                                        }
                                                        knownBirdiesRef.current.get(p.id)!.add(activeHole);

                                                        // Calculate total birdies for this player in the round
                                                        let totalBirdies = 0;
                                                        playerScores.forEach((strokes, holeNum) => {
                                                            const hole = defaultCourse?.holes.find(h => h.hole_number === holeNum);
                                                            const holePar = hole?.par || 4;
                                                            if (strokes === holePar - 1) {
                                                                totalBirdies++;
                                                            }
                                                        });
                                                        birdiePlayerData.push({ name: p.name, totalBirdies });
                                                    }

                                                    // Check if this hole is an eagle (or better)
                                                    if (finalScore <= activeHolePar - 2) {
                                                        // Register eagle locally to prevent global watcher duplicate trigger
                                                        if (!knownEaglesRef.current.has(p.id)) {
                                                            knownEaglesRef.current.set(p.id, new Set());
                                                        }
                                                        knownEaglesRef.current.get(p.id)!.add(activeHole);

                                                        // Calculate total eagles for this player in the round
                                                        let totalEagles = 0;
                                                        playerScores.forEach((strokes, holeNum) => {
                                                            const hole = defaultCourse?.holes.find(h => h.hole_number === holeNum);
                                                            const holePar = hole?.par || 4;
                                                            if (strokes <= holePar - 2) {
                                                                totalEagles++;
                                                            }
                                                        });
                                                        eaglePlayerData.push({ name: p.name, totalEagles });
                                                    }
                                                });

                                                // Update main scores state with pending changes
                                                setScores(newScores);

                                                // Save all scores to server
                                                if (updates.length > 0) {
                                                    await saveLiveScore({
                                                        liveRoundId,
                                                        holeNumber: activeHole,
                                                        playerScores: updates
                                                    });
                                                }

                                                // Show celebration if there's a birdie or eagle on this hole
                                                if (birdiePlayerData.length > 0) {
                                                    setBirdiePlayers(birdiePlayerData);
                                                }
                                                if (eaglePlayerData.length > 0) {
                                                    setEaglePlayers(eaglePlayerData);
                                                }

                                                // Clear pending scores and reset unsaved flag
                                                setPendingScores(new Map());
                                                setHasUnsavedChanges(false);

                                                // Only advance to next hole if this was a new hole (not an update)
                                                if (!wasAlreadyScored) {
                                                    if (activeHole < 18) {
                                                        setActiveHole(activeHole + 1);
                                                    } else {
                                                        // After 18th hole, find the first hole that has missing scores
                                                        let nextHole = 1;
                                                        for (let h = 1; h <= 18; h++) {
                                                            const isHoleIncomplete = selectedPlayers.some(p => {
                                                                const pScores = newScores.get(p.id);
                                                                return !pScores || !pScores.has(h);
                                                            });

                                                            if (isHoleIncomplete) {
                                                                nextHole = h;
                                                                break;
                                                            }
                                                        }
                                                        setActiveHole(nextHole);
                                                    }
                                                }

                                                // Silent refresh to keep server data in sync without flashing the page
                                                router.refresh();
                                            }}
                                            className={`${(() => {
                                                // Check if this hole has been scored for all selected players
                                                const isHoleScored = selectedPlayers.every(p => {
                                                    const playerScores = scores.get(p.id);
                                                    return playerScores && playerScores.has(activeHole);
                                                });
                                                // Blue if: has unsaved changes OR hole is not yet scored
                                                // Black if: hole is scored AND no unsaved changes
                                                return (hasUnsavedChanges || !isHoleScored) ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black hover:bg-gray-800';
                                            })()} w-auto whitespace-nowrap text-white font-bold px-8 py-2 rounded-full shadow-sm transition-colors text-[20pt] flex items-center justify-center gap-2`}
                                        >
                                            Save Hole {activeHole}
                                        </button>
                                    )
                                }
                            </div>
                            <div className="space-y-1">
                                {[...selectedPlayers]
                                    .sort((a, b) => {
                                        const firstA = splitName(a.name).first.toLowerCase();
                                        const firstB = splitName(b.name).first.toLowerCase();
                                        return firstA.localeCompare(firstB);
                                    })
                                    .map(player => {
                                        const score = getScore(player.id, activeHole);
                                        // Calculate Totals for To Par
                                        const pScores = scores.get(player.id);
                                        let totalScore = 0;
                                        let totalScoredPar = 0;
                                        if (pScores) {
                                            pScores.forEach((strokes, hNum) => {
                                                totalScore += strokes;
                                                const hPar = defaultCourse?.holes.find(h => h.hole_number === hNum)?.par || 4;
                                                totalScoredPar += hPar;
                                            });
                                        }
                                        const diff = totalScore - totalScoredPar;
                                        let toParStr = "E";
                                        let toParClass = "text-green-600";
                                        if (diff > 0) {
                                            toParStr = `+${diff}`;
                                            toParClass = "text-gray-900";
                                        } else if (diff < 0) {
                                            toParStr = `${diff}`;
                                            toParClass = "text-red-600";
                                        }

                                        const courseHcp = getCourseHandicap(player);

                                        const playerRankIndex = rankedPlayers.findIndex(rp => rp.id === player.id);
                                        let displayRank: React.ReactNode = playerRankIndex !== -1 ? playerRankIndex + 1 : '-';
                                        let showFlagNextToName = false;
                                        let showRankIconNextToName: React.ReactNode = null;

                                        if (playerRankIndex !== -1 && rankedPlayers[playerRankIndex].thru >= 18) {
                                            if (allActiveFinished) {
                                                if (playerRankIndex === 0) {
                                                    displayRank = "🏆";
                                                    showRankIconNextToName = "🏆";
                                                } else if (playerRankIndex === 1) {
                                                    displayRank = "🥈";
                                                    showRankIconNextToName = "🥈";
                                                } else if (playerRankIndex === 2) {
                                                    displayRank = "🥉";
                                                    showRankIconNextToName = "🥉";
                                                } else {
                                                    showFlagNextToName = true;
                                                }
                                            } else {
                                                showFlagNextToName = true;
                                            }
                                        }

                                        return (
                                            <div key={player.id} className="flex justify-between items-center bg-gray-50 rounded-xl p-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col items-start leading-tight">
                                                        <div className="font-bold text-gray-900 text-[18pt] leading-tight">{splitName(player.name).first}</div>
                                                        <div className="text-gray-700 text-[15pt] leading-tight">{splitName(player.name).last}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {showRankIconNextToName && <span className="text-[20pt] leading-none">{showRankIconNextToName}</span>}
                                                        {showFlagNextToName && <span className="text-[20pt] leading-none">🏁</span>}
                                                        {(player.isGuest || player.id.startsWith('guest-')) && canUpdate && (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingGuest({
                                                                        id: player.id,
                                                                        name: player.name,
                                                                        index: player.index,
                                                                        courseHandicap: player.liveRoundData?.course_hcp || 0
                                                                    });
                                                                    setIsGuestModalOpen(true);
                                                                }}
                                                                className="ml-1 text-blue-600 hover:text-blue-800 text-[12pt] font-semibold"
                                                            >
                                                                ✏️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {canUpdate && (
                                                        <button
                                                            onClick={() => updateScore(player.id, false)}
                                                            className="w-12 h-12 rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-bold shadow-md active:scale-95 transition-transform text-[30pt]"
                                                        >
                                                            -
                                                        </button>
                                                    )}
                                                    <div className="w-16 text-center font-bold text-[50pt] text-gray-800">
                                                        {score || <span className="text-gray-800">{activeHolePar}</span>}
                                                    </div>
                                                    {canUpdate && (
                                                        <button
                                                            onClick={() => updateScore(player.id, true)}
                                                            className="w-12 h-12 rounded-full bg-[#00c950] flex items-center justify-center text-white font-bold shadow-md active:scale-95 transition-transform text-[30pt]"
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )
                }


                <div className="pt-4"></div>
                {/* Live Scores Summary */}
                {
                    summaryPlayers.length > 0 && (
                        <div className="mt-1 space-y-2">
                            <div className="flex gap-2 my-1">
                                <button
                                    onClick={() => router.refresh()}
                                    className="flex-1 bg-black text-white rounded-full py-2 text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                                >
                                    Summary - Refresh
                                </button>
                                <button
                                    onClick={() => setIsStatsModalOpen(true)}
                                    className="w-16 bg-black text-white rounded-full py-2 text-[15pt] hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                                >
                                    🖕
                                </button>
                            </div>

                            <div className="space-y-1">
                                {rankedPlayers.map((p, i) => {
                                    let toParStr = "E";
                                    let toParClass = "text-green-600";
                                    if (p.toPar > 0) {
                                        toParStr = `+${p.toPar}`;
                                        toParClass = "text-gray-900";
                                    } else if (p.toPar < 0) {
                                        toParStr = `${p.toPar}`;
                                        toParClass = "text-red-600";
                                    }

                                    let displayRankInSummary: React.ReactNode = i + 1;
                                    let showFlagInSummary = false;
                                    let showRankIconInSummary: React.ReactNode = null;

                                    if (p.thru >= 18) {
                                        if (allActiveFinished) {
                                            if (i === 0) {
                                                displayRankInSummary = "🏆";
                                                showRankIconInSummary = "🏆";
                                            } else if (i === 1) {
                                                displayRankInSummary = "🥈";
                                                showRankIconInSummary = "🥈";
                                            } else if (i === 2) {
                                                displayRankInSummary = "🥉";
                                                showRankIconInSummary = "🥉";
                                            } else {
                                                showFlagInSummary = true;
                                            }
                                        } else {
                                            showFlagInSummary = true;
                                        }
                                    }

                                    return (
                                        <div key={p.id} className="bg-white shadow-lg rounded-xl overflow-hidden my-1 border-4 border-gray-300">
                                            {/* Player Header */}
                                            <div className="bg-[#1d4ed8] p-1 text-white">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <div className="font-bold text-[15pt] leading-tight">{splitName(p.name).first}</div>
                                                            <div className="text-[12pt] leading-tight opacity-90">{splitName(p.name).last}</div>
                                                        </div>
                                                        <div className="flex items-center">
                                                            {showRankIconInSummary && <span className="text-[20pt] leading-none">{showRankIconInSummary}</span>}
                                                            {showFlagInSummary && <span className="text-[20pt] leading-none">🏁</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-4 items-center">
                                                        <div className={`bg-white font-bold rounded px-2 h-8 flex items-center justify-center text-[15pt] min-w-[3rem] ${toParClass}`}>
                                                            {toParStr}
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-[15pt] opacity-80 font-bold tracking-wider">GRS</div>
                                                            <div className="text-[15pt] font-bold leading-none">
                                                                {p.front9 > 0 || p.back9 > 0 ? (
                                                                    <>{p.front9}+{p.back9}={p.totalGross}</>
                                                                ) : (
                                                                    <>{p.totalGross}</>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[15pt] opacity-80 font-bold tracking-wider">HCP</div>
                                                            <div className="text-[15pt] font-bold leading-none">{p.strokesReceivedSoFar}/{p.courseHcp}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[15pt] opacity-80 font-bold tracking-wider">NET</div>
                                                            <div className="text-[15pt] font-bold leading-none">{p.totalNet}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Score Grid */}
                                            <div className="p-1 border border-black rounded shadow-sm overflow-hidden">
                                                {/* Row 1: Holes 1-9 */}
                                                <div className="grid grid-cols-9 border-b border-black">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                                        const score = getSavedScore(p.id, num);
                                                        const isActive = activeHole === num;
                                                        const hole = defaultCourse?.holes.find(h => h.hole_number === num);
                                                        const holePar = hole?.par || 4;

                                                        let bgClass = "bg-white";
                                                        if (score !== null) {
                                                            const diff = score - holePar;
                                                            if (diff <= -2) bgClass = "bg-yellow-300"; // Eagle: Darker Yellow
                                                            else if (diff === -1) bgClass = "bg-green-300"; // Birdie: Darker Green
                                                            else if (diff === 0) bgClass = "bg-white"; // Par: Pure White
                                                            else if (diff === 1) bgClass = "bg-orange-200"; // Bogey: Darker Orange
                                                            else if (diff >= 2) bgClass = "bg-red-300"; // Double Bogey+: Darker Red
                                                        } else if (isActive) {
                                                            bgClass = "bg-green-50";
                                                        }

                                                        return (
                                                            <div key={num} className={`
                                                            flex flex-col items-center justify-center h-16 border-r border-black last:border-r-0 relative bg-white
                                                            ${isActive ? 'ring-2 ring-black ring-inset z-10' : ''}
                                                        `}>
                                                                <div className="absolute top-1 inset-x-0 flex justify-center px-1.5 text-gray-900 items-baseline gap-0.5">
                                                                    <span className="text-[13pt] font-bold">{num}</span>
                                                                    <span className="text-[12pt] font-normal opacity-80">/{holePar}</span>
                                                                </div>
                                                                <div className={`text-[16pt] font-bold px-2 py-0.5 rounded mt-7 ${bgClass} ${score !== null ? 'text-gray-900' : 'text-transparent'}`}>
                                                                    {score || '-'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {/* Row 2: Holes 10-18 */}
                                                <div className="grid grid-cols-9">
                                                    {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => {
                                                        const score = getSavedScore(p.id, num);
                                                        const isActive = activeHole === num;
                                                        const hole = defaultCourse?.holes.find(h => h.hole_number === num);
                                                        const holePar = hole?.par || 4;

                                                        let bgClass = "bg-white";
                                                        if (score !== null) {
                                                            const diff = score - holePar;
                                                            if (diff <= -2) bgClass = "bg-yellow-300"; // Eagle: Darker Yellow
                                                            else if (diff === -1) bgClass = "bg-green-300"; // Birdie: Darker Green
                                                            else if (diff === 0) bgClass = "bg-white"; // Par: Pure White
                                                            else if (diff === 1) bgClass = "bg-orange-200"; // Bogey: Darker Orange
                                                            else if (diff >= 2) bgClass = "bg-red-300"; // Double Bogey+: Darker Red
                                                        } else if (isActive) {
                                                            bgClass = "bg-green-50";
                                                        }

                                                        return (
                                                            <div key={num} className={`
                                                            flex flex-col items-center justify-center h-16 border-r border-black last:border-r-0 relative bg-white
                                                            ${isActive ? 'ring-2 ring-black ring-inset z-10' : ''}
                                                        `}>
                                                                <div className="absolute top-1 inset-x-0 flex justify-center px-1.5 text-gray-900 items-baseline gap-0.5">
                                                                    <span className="text-[13pt] font-bold">{num}</span>
                                                                    <span className="text-[12pt] font-normal opacity-80">/{holePar}</span>
                                                                </div>
                                                                <div className={`text-[16pt] font-bold px-2 py-0.5 rounded mt-7 ${bgClass} ${score !== null ? 'text-gray-900' : 'text-transparent'}`}>
                                                                    {score || '-'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                }

                {/* Score Legend */}
                < div className="bg-white rounded-[100px] shadow-lg border-2 border-black py-1 px-5 mt-1 flex flex-wrap gap-5 items-center justify-center text-[15pt]" >
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-yellow-300 border-2 border-black/20"></div>Eagle (-2)</div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-green-300 border-2 border-black/20"></div>Birdie (-1)</div>
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-white border-2 border-black/20"></div>Par (E)</div>
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-orange-200 border-2 border-black/20"></div>Bogey (+1)</div>
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-red-300 border-2 border-black/20"></div>Double+ (+2)</div>
                </div>

                {/* Save Round Button - Admin Only */}
                {
                    isAdmin && liveRoundId && selectedPlayers.length > 0 && (
                        <button
                            onClick={() => {
                                setConfirmConfig({
                                    isOpen: true,
                                    title: 'Save Round',
                                    message: 'Save this round? This will finalize all scores. This data is isolated and will NOT affect handicaps or main scores.',
                                    isDestructive: false,
                                    onConfirm: async () => {
                                        setConfirmConfig(null);
                                        alert('Round saved successfully! Note: This is a live scoring session only and does not affect official handicaps.');
                                        window.location.reload();
                                    }
                                });
                            }}
                            className="w-full bg-black hover:bg-gray-800 text-white font-bold px-4 py-2 rounded-full shadow-lg transition-colors text-[15pt] mt-1 mb-1"
                        >
                            💾 Save Round
                        </button>
                    )
                }

                {/* Scorecard Reminder */}
                <div className="w-auto mx-1 px-1 text-center py-4">
                    <p className="text-[16pt] font-bold text-gray-900">
                        (If not Sat, text Vincent to submit scorecard.)
                    </p>
                </div>
            </main >

            {/* Add to Club Modal */}
            < AddToClubModal
                isOpen={isAddToClubModalOpen}
                onClose={() => setIsAddToClubModalOpen(false)}
                players={rankedPlayers}
                liveRoundId={liveRoundId || ''}
                onSave={handleCopyToClub}
            />

            {/* Stats Modal */}
            {
                isStatsModalOpen && (
                    <div className="fixed inset-0 z-[300] bg-gray-50 overflow-y-auto">
                        {/* Header */}
                        <div className="bg-white shadow-sm sticky top-0 z-10 px-1 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h1 className="text-[18pt] font-bold text-gray-900 tracking-tight text-left ml-3">Round Stats</h1>
                                <button
                                    onClick={() => setIsStatsModalOpen(false)}
                                    className="px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors mr-3"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-3 space-y-4">
                            {/* Birdies Section */}
                            <div className="bg-white rounded-xl shadow-lg p-3 border-2 border-green-500">
                                <h2 className="text-[16pt] font-bold text-green-700 mb-3 flex items-center gap-2">
                                    🖕 Birdies (1 Under Par)
                                </h2>
                                <div className="space-y-2">
                                    {birdieLeaders.length > 0 ? (
                                        birdieLeaders.map(player => (
                                            <div key={player.id} className="flex justify-between items-center bg-green-50 rounded-lg p-2">
                                                <span className="text-[15pt] font-bold text-gray-900">{player.name}</span>
                                                <span className="text-[18pt] font-black text-green-700">{player.birdieCount}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-center py-4">No birdies yet</p>
                                    )}
                                </div>
                            </div>

                            {/* Eagles Section */}
                            <div className="bg-white rounded-xl shadow-lg p-3 border-2 border-yellow-500">
                                <h2 className="text-[16pt] font-bold text-yellow-700 mb-3 flex items-center gap-2">
                                    🦅 Eagles (2 Under Par)
                                </h2>
                                <div className="space-y-2">
                                    {eagleLeaders.length > 0 ? (
                                        eagleLeaders.map(player => (
                                            <div key={player.id} className="flex justify-between items-center bg-yellow-50 rounded-lg p-2">
                                                <span className="text-[15pt] font-bold text-gray-900">{player.name}</span>
                                                <span className="text-[18pt] font-black text-yellow-700">{player.eagleCount}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-center py-4">No eagles yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Birdie Celebration Popup */}
            {
                birdiePlayers.length > 0 && (
                    <div
                        className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 animate-in fade-in duration-300"
                        onClick={() => setBirdiePlayers([])}
                    >
                        <div
                            className="animate-in zoom-in-95 duration-500 flex flex-col items-center gap-4"
                            onClick={(e) => e.stopPropagation()}
                        >

                            <div className="bg-white rounded-2xl px-6 py-4 shadow-2xl flex flex-col items-center max-w-sm mx-4">
                                <img
                                    src="/birdie-celebration.png"
                                    alt="Birdie!"
                                    className="w-64 h-64 object-contain drop-shadow-md mb-2"
                                />

                                <div className="text-[18pt] font-bold text-gray-900 text-center mb-4 w-full">
                                    {[...birdiePlayers].sort((a, b) => b.totalBirdies - a.totalBirdies).map((player, index) => (
                                        <div key={index} className="mb-2 last:mb-0 border-b last:border-0 border-gray-100 pb-2 last:pb-0">
                                            <div className="leading-tight">{player.name}</div>
                                            <div className="text-[14pt] text-green-600 font-bold leading-tight">
                                                {player.totalBirdies} {player.totalBirdies === 1 ? 'Birdie' : 'Birdies'} Total
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setBirdiePlayers([]);
                                    }}
                                    className="w-full bg-black text-white rounded-full py-2 text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Eagle Celebration Popup */}
            {
                eaglePlayers.length > 0 && (
                    <div
                        className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 animate-in fade-in duration-300"
                        onClick={() => setEaglePlayers([])}
                    >
                        <div
                            className="animate-in zoom-in-95 duration-500 flex flex-col items-center gap-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white rounded-2xl px-6 py-4 shadow-2xl flex flex-col items-center max-w-sm mx-4 border-4 border-yellow-400">
                                <div className="text-[100pt] leading-none mb-2">🦅</div>
                                <h1 className="text-[30pt] font-black text-yellow-500 mb-4 text-center leading-tight drop-shadow-sm uppercase italic">Awesome Eagle!</h1>

                                <div className="text-[18pt] font-bold text-gray-900 text-center mb-4 w-full">
                                    {[...eaglePlayers].sort((a, b) => b.totalEagles - a.totalEagles).map((player, index) => (
                                        <div key={index} className="mb-2 last:mb-0 border-b last:border-0 border-gray-100 pb-2 last:pb-0">
                                            <div className="leading-tight">{player.name}</div>
                                            <div className="text-[14pt] text-yellow-600 font-bold leading-tight">
                                                {player.totalEagles} {player.totalEagles === 1 ? 'Eagle' : 'Eagles'} Total
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEaglePlayers([]);
                                    }}
                                    className="w-full bg-black text-white rounded-full py-2 text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {confirmConfig && (
                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    isDestructive={confirmConfig.isDestructive}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(null)}
                />
            )}
        </div >
    );
}
