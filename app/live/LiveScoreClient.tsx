'use client';
// build-trigger: 1.0.1

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
import { removePlayerFromLiveRound } from '@/app/actions/remove-player-from-live-round'; // Force reload

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
    elements?: HoleElement[];
}

interface HoleElement {
    id: string;
    side: string;
    element_number: number;
    front_latitude?: number | null;
    front_longitude?: number | null;
    back_latitude?: number | null;
    back_longitude?: number | null;
    water?: boolean;
    bunker?: boolean;
    tree?: boolean;
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

    const [isAdmin, setIsAdmin] = useState(false); // Initialize to false, update in useEffect
    // Start with empty selection - each device manages its own group
    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
    const [isSaving, setIsSaving] = useState(false); // Used to show 'Saving' state on button

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
    const [isGPSEnabled, setIsGPSEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('gps_enabled');
            return saved !== null ? saved === 'true' : true;
        }
        return true;
    });
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
        confirmText?: string;
        cancelText?: string;
        hideCancel?: boolean;
    } | null>(null);

    const showAlert = (title: string, message: string) => {
        setConfirmConfig({
            isOpen: true,
            title,
            message,
            onConfirm: () => setConfirmConfig(null),
            hideCancel: true,
            confirmText: 'OK'
        });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
        setConfirmConfig({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmConfig(null);
            },
            isDestructive
        });
    };

    // Persist GPS setting
    useEffect(() => {
        localStorage.setItem('gps_enabled', isGPSEnabled.toString());
    }, [isGPSEnabled]);

    // GPS Logic with fallback for desktop
    useEffect(() => {
        if (!navigator.geolocation || !isGPSEnabled) {
            // Clear location when GPS is disabled
            if (!isGPSEnabled) {
                setUserLocation(null);
            }
            return;
        }

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
                            // Silent watch error
                        },
                        { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
                    );
                },
                (error) => {
                    // High accuracy failed, try low accuracy (for desktop)
                    // Silent retry

                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            hasGotLocation = true;
                            setUserLocation({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            });

                            // Start watching with low accuracy
                            watchId = navigator.geolocation.watchPosition(
                                (pos) => {
                                    setUserLocation({
                                        latitude: pos.coords.latitude,
                                        longitude: pos.coords.longitude
                                    });
                                },
                                () => { /* Silent error */ },
                                { enableHighAccuracy: false, timeout: 60000, maximumAge: 30000 }
                            );
                        },
                        () => { /* Silent error - handled by UI status */ },
                        { enableHighAccuracy: false, timeout: 60000, maximumAge: 30000 }
                    );
                },
                { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
            );
        };

        getInitialPosition();

        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isGPSEnabled]);

    // Disable scroll restoration to prevent jumps on refresh
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
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
                const restored = savedIds.map((id: string) =>
                    allAvailablePlayers.find((p: Player) => p.id === id)
                ).filter((p: Player | undefined): p is Player => p !== undefined);

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


    // Polling for updates (every 20 seconds) - Increased from 10s to reduce jumps
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 20000);
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

    // Sync activeHole to URL whenever it changes without scrolling
    useEffect(() => {
        const currentHole = searchParams.get('hole');
        if (currentHole === activeHole.toString()) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('hole', activeHole.toString());
        const newUrl = `${window.location.pathname}?${params.toString()}`;

        // Use router.replace with scroll: false to be absolutely sure Next.js doesn't scroll
        router.replace(newUrl, { scroll: false });
    }, [activeHole, router, searchParams]);

    // Cleanup state when moving to a new hole
    useEffect(() => {
        setHasUnsavedChanges(false);
        setPendingScores(new Map());
    }, [activeHole]);
    // Check admin status on mount and listen for changes
    useEffect(() => {
        const checkAdmin = () => {
            const adminCookie = Cookies.get('admin_session');
            setIsAdmin(adminCookie === 'true');
        };

        checkAdmin();

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
            showAlert('Error', 'No active live round found');
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
            showAlert('Error', 'Failed to add guest: ' + result.error);
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
            showAlert('Error', 'Failed to update guest: ' + result.error);
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
            showAlert('Error', 'Failed to delete guest: ' + result.error);
        }
    };

    const handleCopyToClub = async (selectedPlayerIds: string[]) => {
        if (!liveRoundId) {
            showAlert('Error', 'No live round selected');
            return;
        }

        const result = await copyLiveToClub({
            liveRoundId,
            playerIds: selectedPlayerIds
        });

        if (result.success) {
            showAlert('Success', result.message || 'Successfully copied to club scores!');
        } else {
            showAlert('Error', 'Failed to copy: ' + result.error);
        }
    };

    const movePlayerOrder = (index: number, direction: 'up' | 'down') => {
        const newSelected = [...selectedPlayers];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newSelected.length) {
            [newSelected[index], newSelected[targetIndex]] = [newSelected[targetIndex], newSelected[index]];
            setSelectedPlayers(newSelected);
            localStorage.setItem('live_scoring_my_group', JSON.stringify(newSelected.map(p => p.id)));
        }
    };
    const handleAddPlayers = async (newSelectedPlayerIds: string[]) => {
        const allAvailable = [...allPlayers, ...guestPlayers];
        const combinedSelection = newSelectedPlayerIds.map(id =>
            allAvailable.find(p => p.id === id)
        ).filter((p): p is Player => p !== undefined);

        setSelectedPlayers(combinedSelection);

        const newSelectedPlayers = combinedSelection.filter(p => !p.isGuest && !p.id.startsWith('guest-'));
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
                    showAlert('Error', "Failed to start live round: " + result.error);
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

        // 3. Handle Removals (Admin Only)
        // If an admin unselects a player who was already in the round, remove them from DB entirely
        if (isAdmin && currentLiveRoundId && initialRound?.players) {
            for (const lrPlayer of initialRound.players) {
                const playerId = lrPlayer.is_guest ? lrPlayer.id : lrPlayer.player.id;
                if (!newSelectedPlayerIds.includes(playerId)) {
                    console.log("Admin removing player from round:", lrPlayer.id);
                    await removePlayerFromLiveRound(lrPlayer.id);
                }
            }
            // Refresh to update server-side round state
            router.refresh();
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
                    // Navigate to the new round without scrolling
                    router.push(`/live?roundId=${result.roundId}`, { scroll: false });
                    router.refresh();
                } else {
                    showAlert('Error', 'Failed to create new round: ' + (result.error || 'Unknown error'));
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
                    <div style={{ minHeight: '80px' }} className="bg-white rounded-xl shadow-lg p-1 border-4 border-gray-300 flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[15pt] font-bold text-gray-900 ml-1">Select Round:</label>
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
                                    router.push(`/live?roundId=${e.target.value}`, { scroll: false });
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
                                                    const password = prompt("Enter password to delete:");
                                                    if (password !== 'cpgc-Delete') {
                                                        showAlert('Error', 'Incorrect password.');
                                                        return;
                                                    }

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
                                                                showAlert('Error', 'Failed to delete round.');
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
                    showAlert={showAlert}
                />

                {/* Player Selection Modal */}
                <LivePlayerSelectionModal
                    isOpen={isPlayerModalOpen}
                    onClose={() => setIsPlayerModalOpen(false)}
                    allPlayers={[...allPlayers, ...guestPlayers]}
                    selectedIds={selectedPlayers.map(p => p.id)}
                    playersInRound={initialRound?.players?.map((p: any) => p.is_guest ? p.id : p.player.id) || []}
                    onSelectionChange={handleAddPlayers}
                    isAdmin={isAdmin}
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
                                <div className="flex items-center gap-2">
                                    <h2 className="text-[15pt] font-black text-gray-900 tracking-tight shrink-0">GPS</h2>
                                    <button
                                        onClick={() => setIsGPSEnabled(!isGPSEnabled)}
                                        className={`px-3 py-1 rounded-full text-[13pt] font-bold transition-all shadow-sm active:scale-95 ${isGPSEnabled
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                            }`}
                                    >
                                        {isGPSEnabled ? '🛰️ ON' : '🛰️ OFF'}
                                    </button>
                                </div>
                                <h2 className="text-[14pt] font-bold text-gray-900 text-right truncate">{defaultCourse?.name}</h2>
                            </div>

                            {!allPlayersFinished && isGPSEnabled && (
                                <div style={{ minHeight: '140px' }} className="flex flex-col justify-center">
                                    {/* GPS Distance Display */}
                                    {(() => {
                                        const currentHole = defaultCourse?.holes.find(h => h.hole_number === activeHole);

                                        if (!userLocation) {
                                            return (
                                                <div className="bg-gray-100 text-gray-500 p-1 rounded-xl border-2 border-dashed border-gray-300 text-center mb-2 shadow-inner">
                                                    <p className="font-medium text-[15pt] animate-pulse py-6">🛰️ Waiting for GPS...</p>
                                                </div>
                                            );
                                        }

                                        if (!currentHole?.latitude || !currentHole?.longitude) {
                                            return (
                                                <div className="bg-yellow-50 text-yellow-700 p-1 rounded-xl text-center mb-2 shadow-inner border-2 border-yellow-400">
                                                    <p className="font-medium text-[15pt] py-6">📍 Coordinates missing for Hole {activeHole}</p>
                                                </div>
                                            );
                                        }

                                        const dist = calculateDistance(
                                            userLocation.latitude,
                                            userLocation.longitude,
                                            Number(currentHole.latitude),
                                            Number(currentHole.longitude)
                                        );

                                        const getElement = (side: string, num: number) =>
                                            currentHole.elements?.find(e => e.side === side && e.element_number === num);

                                        const renderElement = (side: 'LEFT' | 'RIGHT', num: number, positionClass: string) => {
                                            const el = getElement(side, num);
                                            if (!el) return null;

                                            const distFront = (el.front_latitude && el.front_longitude) ? calculateDistance(userLocation.latitude, userLocation.longitude, Number(el.front_latitude), Number(el.front_longitude)) : null;
                                            const distBack = (el.back_latitude && el.back_longitude) ? calculateDistance(userLocation.latitude, userLocation.longitude, Number(el.back_latitude), Number(el.back_longitude)) : null;

                                            if (!distFront && !distBack && !el.water && !el.bunker && !el.tree) return null;

                                            const Icons = (
                                                <div className="flex gap-0.5">
                                                    {el.water && <span>💧</span>}
                                                    {el.bunker && <div className="w-7 h-7 bg-[#d2b48c] border border-black/20" />}
                                                    {el.tree && <span>🌳</span>}
                                                </div>
                                            );

                                            const Numbers = (
                                                <div className={`flex flex-col ${side === 'LEFT' ? 'items-start' : 'items-end'} leading-none`}>
                                                    <span className={distBack === null ? 'invisible' : ''}>{distBack ?? '--'}</span>
                                                    <span className={distFront === null ? 'invisible' : ''}>{distFront ?? '--'}</span>
                                                </div>
                                            );

                                            return (
                                                <div className={`absolute ${positionClass} flex items-center gap-1 text-white/90 text-[20pt] font-bold z-10`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                                    {side === 'LEFT' ? (
                                                        <>
                                                            {Icons}
                                                            {Numbers}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {Numbers}
                                                            {Icons}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        };

                                        return (
                                            <div className="bg-green-600 text-white w-full mx-auto p-1 rounded-xl text-center mb-2 border-2 border-black shadow-inner relative overflow-hidden">
                                                {/* Left Elements */}
                                                {renderElement('LEFT', 2, 'top-2 left-2')}
                                                {renderElement('LEFT', 1, 'bottom-2 left-2')}

                                                {/* Right Elements */}
                                                {renderElement('RIGHT', 2, 'top-2 right-2')}
                                                {renderElement('RIGHT', 1, 'bottom-2 right-2')}

                                                <p className="font-black text-[70pt] leading-none flex items-center justify-center pt-2 pb-4">
                                                    {dist}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            <div className="grid grid-cols-6 gap-1">
                                {defaultCourse?.holes.map(hole => {
                                    // Use selected group if available, otherwise check all players in the round
                                    const playersForStatus = selectedPlayers.length > 0 ? selectedPlayers : rankedPlayers;

                                    const isSaved = playersForStatus.some(p => {
                                        const pScores = scores.get(p.id);
                                        return pScores && pScores.has(hole.hole_number);
                                    });

                                    const isActive = activeHole === hole.hole_number;
                                    const isMissing = playersForStatus.length > 0 && !isActive && !isSaved && hole.hole_number < activeHole;

                                    // Determine styling
                                    let btnClass = "bg-white text-black border border-black";
                                    if (isActive) {
                                        // Active hole: always white on blue (with or without data)
                                        btnClass = "bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1 z-10 scale-105 shadow-md";
                                    } else if (isMissing) {
                                        // Missing scores before current hole: red
                                        btnClass = "bg-[#ff3b30] text-white border-[#ff3b30]";
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
                        <div id="scoring-section" className="bg-white rounded-xl shadow-lg border-2 border-black my-1 py-0 px-2">
                            <div className="flex justify-between items-center mb-0">
                                <h2 className="text-[14pt] font-black text-gray-900 tracking-tight">Players</h2>
                                {
                                    selectedPlayers.length > 0 && canUpdate && (
                                        <button
                                            onClick={() => {
                                                if (!liveRoundId || isSaving) return;
                                                // Prevent double clicks but don't block
                                                setIsSaving(true);

                                                // Capture current state values for async operation
                                                const currentHole = activeHole;
                                                const updates: { playerId: string; strokes: number }[] = [];
                                                const newScores = new Map(scores);

                                                // Check if this hole was already scored (for all players)
                                                const wasAlreadyScored = selectedPlayers.every(p => {
                                                    const playerScores = scores.get(p.id);
                                                    return playerScores && playerScores.has(currentHole);
                                                });

                                                // Check if anyone scored a birdie on this hole
                                                const birdiePlayerData: Array<{ name: string; totalBirdies: number }> = [];
                                                const eaglePlayerData: Array<{ name: string; totalEagles: number }> = [];
                                                const activeHolePar = defaultCourse?.holes.find(h => h.hole_number === currentHole)?.par || 4;

                                                selectedPlayers.forEach(p => {
                                                    const playerScores = new Map(newScores.get(p.id) || []);

                                                    // Use pending score if it exists, otherwise use saved score or par
                                                    const pendingScore = pendingScores.get(p.id);
                                                    const savedScore = playerScores.get(currentHole);
                                                    const finalScore = pendingScore ?? savedScore ?? activeHolePar;

                                                    // Update the score in the map
                                                    playerScores.set(currentHole, finalScore);
                                                    newScores.set(p.id, playerScores);

                                                    // Add to updates for server
                                                    updates.push({ playerId: p.id, strokes: finalScore });

                                                    // Check if this hole is a birdie
                                                    if (finalScore === activeHolePar - 1) {
                                                        // Register birdie locally to prevent global watcher duplicate trigger
                                                        if (!knownBirdiesRef.current.has(p.id)) {
                                                            knownBirdiesRef.current.set(p.id, new Set());
                                                        }
                                                        knownBirdiesRef.current.get(p.id)!.add(currentHole);

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
                                                        knownEaglesRef.current.get(p.id)!.add(currentHole);

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

                                                // 1. UPDATE LOCAL STATE IMMEDIATELY (Optimistic)
                                                setScores(newScores);

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

                                                // Determine next hole
                                                let nextHoleToSet = currentHole;
                                                if (!wasAlreadyScored) {
                                                    if (currentHole < 18) {
                                                        nextHoleToSet = currentHole + 1;
                                                    } else {
                                                        // After 18th hole, find the first hole that has missing scores
                                                        let foundNext = 1;
                                                        for (let h = 1; h <= 18; h++) {
                                                            const isHoleIncomplete = selectedPlayers.some(p => {
                                                                const pScores = newScores.get(p.id);
                                                                return !pScores || !pScores.has(h);
                                                            });

                                                            if (isHoleIncomplete) {
                                                                foundNext = h;
                                                                break;
                                                            }
                                                        }
                                                        nextHoleToSet = foundNext;
                                                    }
                                                    setActiveHole(nextHoleToSet);
                                                }

                                                // 2. RELEASE UI LOCK IMMEDIATELY
                                                setIsSaving(false);

                                                // 3. BACKGROUND SERVER SAVE
                                                if (updates.length > 0) {
                                                    saveLiveScore({
                                                        liveRoundId,
                                                        holeNumber: currentHole,
                                                        playerScores: updates
                                                    }).then(() => {
                                                        // Silent refresh to keep server data in sync
                                                        router.refresh();
                                                    }).catch((error) => {
                                                        console.error("Background save failed:", error);
                                                        alert("Failed to save scores to server. Please check your connection.");
                                                    });
                                                }
                                            }}
                                            disabled={isSaving}
                                            className={`${(() => {
                                                // Check if this hole has been scored for all selected players
                                                const isHoleScored = selectedPlayers.every(p => {
                                                    const playerScores = scores.get(p.id);
                                                    return playerScores && playerScores.has(activeHole);
                                                });
                                                // Blue if: has unsaved changes OR hole is not yet scored
                                                // Black if: hole is scored AND no unsaved changes
                                                return (hasUnsavedChanges || !isHoleScored) ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black hover:bg-gray-800';
                                            })()} w-auto whitespace-nowrap text-white font-bold px-8 py-2 mt-1 rounded-full shadow-sm transition-colors text-[20pt] flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 disabled:cursor-not-allowed' : ''}`}
                                        >
                                            <div className="relative">
                                                <span className={isSaving ? 'invisible' : 'visible'}>
                                                    Save Hole {activeHole}
                                                </span>
                                                {isSaving && (
                                                    <span className="absolute inset-0 flex items-center justify-center">
                                                        Saving
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    )
                                }
                            </div>
                            <div className="space-y-0">
                                {[...selectedPlayers]
                                    .map((player, index) => {
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
                                            <div key={player.id} className="flex justify-between items-center bg-gray-50 rounded-xl py-0 px-1">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            const newSelected = selectedPlayers.filter(p => p.id !== player.id);
                                                            setSelectedPlayers(newSelected);
                                                            localStorage.setItem('live_scoring_my_group', JSON.stringify(newSelected.map(p => p.id)));
                                                        }}
                                                        className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
                                                        title="Remove from Group"
                                                    >
                                                        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor"><path d="M11 4h2v12l5.5-5.5 1.42 1.42L12 19.84l-7.92-7.92 1.42-1.42L11 16V4z" /></svg>
                                                    </button>
                                                    <div className="flex flex-col items-start leading-tight">
                                                        <div className="font-bold text-gray-900 text-[18pt] leading-tight">{splitName(player.name).first}</div>
                                                        <div className="text-gray-700 text-[15pt] leading-tight">{splitName(player.name).last}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {/* Icons removed per request */}
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
                                                    <div className="w-16 text-center font-bold text-[40pt] text-gray-800">
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
                        <div id="summary-section" className="mt-1 space-y-2">
                            <div className="flex gap-2 my-1">
                                <button
                                    onClick={() => router.refresh()}
                                    className="flex-1 bg-black text-white rounded-full py-2 text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                                >
                                    Summary - Refresh
                                </button>
                                <button
                                    onClick={() => setIsStatsModalOpen(true)}
                                    className="w-16 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                                >
                                    <span className="text-[28pt] leading-none">🖕</span>
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
                                                        {canUpdate && (isAdmin || !selectedPlayers.some(sp => sp.id === p.id)) && (
                                                            <button
                                                                onClick={() => {
                                                                    if (selectedPlayers.some(sp => sp.id === p.id)) {
                                                                        return;
                                                                    }
                                                                    const hasExistingScores = p.thru > 0;
                                                                    const msg = hasExistingScores
                                                                        ? `This player already has scores recorded by another device. Are you sure you want to take over scoring for ${p.name}?`
                                                                        : `Add ${p.name} to your scoring group?`;

                                                                    showConfirm('Confirm Takeover', msg, () => {
                                                                        const playerObj = allPlayers.find(ap => ap.id === p.id) || p;
                                                                        const newSelected = [...selectedPlayers, playerObj];
                                                                        setSelectedPlayers(newSelected);
                                                                        localStorage.setItem('live_scoring_my_group', JSON.stringify(newSelected.map(sp => sp.id)));
                                                                    });
                                                                }}
                                                                className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-xl active:scale-95 transition-all border-2 border-white"
                                                                title="Add to My Group"
                                                            >
                                                                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M13 20h-2V8l-5.5 5.5-1.42-1.42L12 4.16l7.92 7.92-1.42 1.42L13 8v12z" /></svg>
                                                            </button>
                                                        )}
                                                        <div className="flex flex-col">
                                                            <div className="font-bold text-[16pt] leading-tight flex items-center gap-2">
                                                                {splitName(p.name).first}
                                                            </div>
                                                            <div className="text-[13pt] leading-tight opacity-90">{splitName(p.name).last}</div>
                                                        </div>
                                                        <div className="flex items-center">
                                                            {/* Icons removed per request */}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 items-center">
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
                                                                <div className={`text-[16pt] font-bold px-2 py-0.5 rounded mt-7 ${bgClass} ${score !== null ? 'text-gray-900 font-bold' : 'text-gray-300 font-normal italic'}`}>
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
                                                                <div className={`text-[16pt] font-bold px-2 py-0.5 rounded mt-7 ${bgClass} ${score !== null ? 'text-gray-900 font-black' : 'text-gray-300 font-normal italic'}`}>
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
                <div className="bg-white rounded-xl shadow-md p-2 m-1 flex flex-wrap gap-x-6 gap-y-2 items-center justify-center text-[15pt]">
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-yellow-300 shadow-sm"></div>Eagle (-2)</div>
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-green-300 shadow-sm"></div>Birdie (-1)</div>
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 shadow-sm"></div>Par (E)</div>
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-orange-200 shadow-sm"></div>Bogey (+1)</div>
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-red-300 shadow-sm"></div>Double+ (+2)</div>
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
                                        showAlert('Success', 'Round saved successfully! Note: This is a live scoring session only and does not affect official handicaps.');
                                        // Use silent refresh instead of reload to prevent jumping
                                        router.refresh();
                                    }
                                });
                            }}
                            className="w-full bg-black hover:bg-gray-800 text-white font-bold px-4 py-2 rounded-full shadow-md transition-all active:scale-95 text-[15pt] mt-1 mb-1"
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
                                    <span className="text-[25pt]">🖕</span> Birdies (1 Under Par)
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
            {
                confirmConfig && (
                    <ConfirmModal
                        isOpen={confirmConfig.isOpen}
                        title={confirmConfig.title}
                        message={confirmConfig.message}
                        isDestructive={confirmConfig.isDestructive}
                        confirmText={confirmConfig.confirmText}
                        cancelText={confirmConfig.cancelText}
                        hideCancel={confirmConfig.hideCancel}
                        onConfirm={confirmConfig.onConfirm}
                        onCancel={() => setConfirmConfig(null)}
                    />
                )
            }
        </div >
    );
}
