'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface RoundOption {
    id: string;
    date: string;
    is_tournament: boolean;
    name?: string | null;
    _count: { players: number };
}

export function PoolDateSelector({
    allRounds,
    currentRoundId
}: {
    allRounds: any[], // using any to bypass strict type check for now or match the interface
    currentRoundId: string
}) {
    const router = useRouter();

    return (
        <select
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-[14pt] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
            defaultValue={currentRoundId}
            onChange={(e) => {
                router.push(`/pool?roundId=${e.target.value}`);
            }}
        >
            {allRounds.map(r => {
                const [y, m, d] = r.date.split('T')[0].split('-').map(Number);
                const dStr = format(new Date(y, m - 1, d, 12, 0, 0), 'MMM d, yyyy');
                const playerCount = r._count?.players || 0;
                const displayName = r.name
                    ? `${r.name} (${dStr}) - ${playerCount} players`
                    : `${dStr} - ${playerCount} players`;

                return (
                    <option key={r.id} value={r.id}>
                        {displayName}{r.is_tournament ? ' 🏆' : ''}
                    </option>
                );
            })}
        </select>
    );
}
