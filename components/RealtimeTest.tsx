'use client';

import { useRealtimeScores, useRealtimeMoneyEvents } from '@/hooks/useRealtimeScores';
import { useEffect, useState } from 'react';

interface RealtimeTestProps {
    roundId: string;
}

export default function RealtimeTest({ roundId }: RealtimeTestProps) {
    const { scores, isConnected: scoresConnected, error: scoresError } = useRealtimeScores(roundId);
    const { moneyEvents, isConnected: moneyConnected, error: moneyError } = useRealtimeMoneyEvents(roundId);
    const [updateCount, setUpdateCount] = useState(0);

    useEffect(() => {
        if (scores.length > 0) {
            setUpdateCount(prev => prev + 1);
        }
    }, [scores]);

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-bold mb-4">🔴 Real-Time Connection Test</h3>

            {/* Connection Status */}
            <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${scoresConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">
                        Scores: {scoresConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${moneyConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">
                        Money Events: {moneyConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {/* Errors */}
            {(scoresError || moneyError) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {scoresError && <div>Scores Error: {scoresError}</div>}
                    {moneyError && <div>Money Error: {moneyError}</div>}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">{scores.length}</div>
                    <div className="text-xs text-gray-600">Score Updates</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">{moneyEvents.length}</div>
                    <div className="text-xs text-gray-600">Money Events</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">{updateCount}</div>
                    <div className="text-xs text-gray-600">Updates Received</div>
                </div>
            </div>

            {/* Recent Updates */}
            {scores.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Recent Score Updates:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {scores.slice(-5).reverse().map((score) => (
                            <div key={score.id} className="text-xs p-2 bg-gray-50 rounded">
                                Hole: {score.hole_id.slice(0, 8)}... | Strokes: {score.strokes}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Money Events */}
            {moneyEvents.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Recent Money Events:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {moneyEvents.slice(-5).reverse().map((event) => (
                            <div key={event.id} className="text-xs p-2 bg-green-50 rounded">
                                Hole {event.hole_number}: {event.event_type} - ${event.amount}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p className="font-semibold mb-1">📝 Testing Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                    <li>Open this page in two browser windows side-by-side</li>
                    <li>Submit a score in one window</li>
                    <li>Watch the update appear in both windows instantly</li>
                </ol>
            </div>
        </div>
    );
}
