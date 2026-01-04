import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ScoreUpdate {
    id: string;
    round_player_id: string;
    hole_id: string;
    strokes: number;
    putts: number | null;
    fairway_hit: boolean | null;
    green_in_regulation: boolean | null;
    created_at: string;
}

export interface MoneyEventUpdate {
    id: string;
    round_id: string;
    player_id: string;
    hole_number: number;
    event_type: string;
    amount: number;
    created_at: string;
}

/**
 * Hook to subscribe to real-time score updates for a specific round
 */
export function useRealtimeScores(roundId: string | null) {
    const [scores, setScores] = useState<ScoreUpdate[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roundId) {
            setScores([]);
            setIsConnected(false);
            return;
        }

        let channel: RealtimeChannel | null = null;

        try {
            const supabase = getSupabaseClient();

            // Subscribe to score changes for this round
            channel = supabase
                .channel(`round-scores-${roundId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen to INSERT, UPDATE, DELETE
                        schema: 'public',
                        table: 'scores',
                        filter: `round_player_id=in.(select id from round_players where round_id=eq.${roundId})`
                    },
                    (payload) => {
                        console.log('Score update received:', payload);

                        if (payload.eventType === 'INSERT') {
                            setScores((prev) => [...prev, payload.new as ScoreUpdate]);
                        } else if (payload.eventType === 'UPDATE') {
                            setScores((prev) =>
                                prev.map((score) =>
                                    score.id === payload.new.id ? (payload.new as ScoreUpdate) : score
                                )
                            );
                        } else if (payload.eventType === 'DELETE') {
                            setScores((prev) =>
                                prev.filter((score) => score.id !== payload.old.id)
                            );
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('Subscription status:', status);
                    setIsConnected(status === 'SUBSCRIBED');
                    if (status === 'CHANNEL_ERROR') {
                        setError('Failed to connect to real-time updates');
                    }
                });
        } catch (err) {
            console.error('Error setting up real-time subscription:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        }

        // Cleanup on unmount
        return () => {
            if (channel) {
                channel.unsubscribe();
            }
        };
    }, [roundId]);

    const refresh = useCallback(() => {
        setScores([]);
        setError(null);
    }, []);

    return { scores, isConnected, error, refresh };
}

/**
 * Hook to subscribe to real-time money events for a specific round
 */
export function useRealtimeMoneyEvents(roundId: string | null) {
    const [moneyEvents, setMoneyEvents] = useState<MoneyEventUpdate[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roundId) {
            setMoneyEvents([]);
            setIsConnected(false);
            return;
        }

        let channel: RealtimeChannel | null = null;

        try {
            const supabase = getSupabaseClient();

            // Subscribe to money event changes for this round
            channel = supabase
                .channel(`round-money-${roundId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'money_events',
                        filter: `round_id=eq.${roundId}`
                    },
                    (payload) => {
                        console.log('Money event update received:', payload);

                        if (payload.eventType === 'INSERT') {
                            setMoneyEvents((prev) => [...prev, payload.new as MoneyEventUpdate]);
                        } else if (payload.eventType === 'UPDATE') {
                            setMoneyEvents((prev) =>
                                prev.map((event) =>
                                    event.id === payload.new.id ? (payload.new as MoneyEventUpdate) : event
                                )
                            );
                        } else if (payload.eventType === 'DELETE') {
                            setMoneyEvents((prev) =>
                                prev.filter((event) => event.id !== payload.old.id)
                            );
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('Money events subscription status:', status);
                    setIsConnected(status === 'SUBSCRIBED');
                    if (status === 'CHANNEL_ERROR') {
                        setError('Failed to connect to money event updates');
                    }
                });
        } catch (err) {
            console.error('Error setting up money events subscription:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        }

        return () => {
            if (channel) {
                channel.unsubscribe();
            }
        };
    }, [roundId]);

    const refresh = useCallback(() => {
        setMoneyEvents([]);
        setError(null);
    }, []);

    return { moneyEvents, isConnected, error, refresh };
}

/**
 * Generic hook for subscribing to any table changes
 */
export function useRealtimeTable<T = any>(
    tableName: string,
    filter?: string
) {
    const [data, setData] = useState<T[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let channel: RealtimeChannel | null = null;

        try {
            const supabase = getSupabaseClient();

            const channelName = filter
                ? `${tableName}-${filter.replace(/[^a-zA-Z0-9]/g, '-')}`
                : tableName;

            const subscribeConfig: any = {
                event: '*',
                schema: 'public',
                table: tableName,
            };

            if (filter) {
                subscribeConfig.filter = filter;
            }

            channel = supabase
                .channel(channelName)
                .on('postgres_changes', subscribeConfig, (payload) => {
                    console.log(`${tableName} update:`, payload);

                    if (payload.eventType === 'INSERT') {
                        setData((prev) => [...prev, payload.new as T]);
                    } else if (payload.eventType === 'UPDATE') {
                        setData((prev) =>
                            prev.map((item: any) =>
                                item.id === payload.new.id ? (payload.new as T) : item
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setData((prev) =>
                            prev.filter((item: any) => item.id !== payload.old.id)
                        );
                    }
                })
                .subscribe((status) => {
                    setIsConnected(status === 'SUBSCRIBED');
                    if (status === 'CHANNEL_ERROR') {
                        setError(`Failed to connect to ${tableName} updates`);
                    }
                });
        } catch (err) {
            console.error(`Error setting up ${tableName} subscription:`, err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        }

        return () => {
            if (channel) {
                channel.unsubscribe();
            }
        };
    }, [tableName, filter]);

    return { data, isConnected, error };
}
