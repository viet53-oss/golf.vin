'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import PoolResults from './PoolResults';
import { getPoolResults } from '@/app/actions/get-pool-results';

interface PoolModalProps {
    roundId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function PoolModal({ roundId, isOpen, onClose }: PoolModalProps) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && roundId) {
            setIsLoading(true);
            setError(null);
            fetchData();
        }
    }, [isOpen, roundId]);

    const fetchData = async () => {
        const result = await getPoolResults(roundId);
        if (result.success && result.data) {
            // Reconstruct the winningsMap from the array
            const winningsMap = new Map<string, number>(result.data.winningsArray);
            setData({ ...result.data, winningsMap });
            setIsLoading(false);
        } else {
            setError(result.error || 'Failed to load pool data');
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex flex-col">
                    <h2 className="text-[16pt] font-black text-green-600 leading-tight">$5 Pool Results</h2>
                    {data?.round && (
                        <p className="text-[12pt] text-gray-500 font-medium">
                            {new Date(data.round.date).toLocaleDateString()} {data.round.name ? `- ${data.round.name}` : ''}
                        </p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black"
                >
                    <X className="w-8 h-8" />
                </button>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
                        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                        <p className="text-[14pt] font-bold text-gray-500 animate-pulse">Calculating Pots & Skins...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                        <div className="bg-red-50 text-red-500 p-6 rounded-full">
                            <X className="w-12 h-12" />
                        </div>
                        <h3 className="text-[16pt] font-bold text-gray-900">Oops! Something went wrong</h3>
                        <p className="text-[14pt] text-gray-500 max-w-md">{error}</p>
                        <button
                            onClick={fetchData}
                            className="bg-black text-white px-6 py-2 rounded-full font-bold text-[14pt] hover:bg-gray-800 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto">
                        <PoolResults
                            allPoolParticipants={data.allPoolParticipants}
                            poolActivePlayers={data.poolActivePlayers}
                            round={data.round}
                            flights={data.flights}
                            processedFlights={data.processedFlights}
                            winningsMap={data.winningsMap}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
