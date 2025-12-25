'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Phone, Mail, Edit, Search, ArrowUp, ArrowDown, Copy } from 'lucide-react';
import { calculateHandicap, HandicapInput } from '@/lib/handicap';
import { PlayerWithRounds, PlayerProfileModal } from '@/components/PlayerProfileModal';
import { HandicapHistoryModal } from '@/components/HandicapHistoryModal';

interface PlayersClientProps {
    initialPlayers: PlayerWithRounds[];
    course?: any; // Avoiding deep typing for now, strictly used for HCP calc
}

type SortKey = 'last_name' | 'first_name' | 'hcp' | 'rank' | 'pts' | 'money';

// Define a type for players after processing
interface ProcessedPlayer extends PlayerWithRounds {
    firstName: string;
    lastName: string;
    liveIndex: number;
    courseHandicap: number;
    roundCount: number;
    rank: number; // Official Rank based on Index
    points: number;
    money: number;
}

export default function PlayersClient({ initialPlayers, course }: PlayersClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<ProcessedPlayer | null>(null);
    const [selectedHandicapPlayerId, setSelectedHandicapPlayerId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'last_name', direction: 'asc' });

    // Helper: Calculate Course Handicap
    const getCourseHandicap = (index: number, preferredTee: string | null) => {
        if (!course) return Math.round(index); // Fallback: just round index

        // Find the preferred tee or default to White
        const teeName = preferredTee || 'White';
        const tee = course.tee_boxes.find((t: any) => t.name === teeName) || course.tee_boxes[0];

        if (!tee) return Math.round(index);

        const par = course.holes.reduce((sum: number, h: any) => sum + h.par, 0) || 72;

        // WHS Formula
        const ch = index * (tee.slope / 113) + (tee.rating - par);
        return Math.round(ch);
    };

    // Pre-process players with stats for Valid Sorting and display
    const processedPlayers: ProcessedPlayer[] = useMemo(() => {
        // 1. Calculate Stats
        const withStats = initialPlayers.map(player => {
            const nameParts = player.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            // Calculate Stats (Live Index)
            const tournamentRounds: HandicapInput[] = player.rounds
                .filter((r: any) => r.tee_box && r.gross_score !== null)
                .map((r: any) => ({
                    id: r.id,
                    date: r.round.date,
                    score: (r.adjusted_gross_score || r.gross_score) ?? 0,
                    rating: r.tee_box!.rating,
                    slope: r.tee_box!.slope,
                }));
            const manualRounds: HandicapInput[] = player.manual_rounds.map((m: any) => ({
                id: m.id,
                date: m.date_played,
                differential: m.score_differential
            }));
            const allRounds = [...tournamentRounds, ...manualRounds];
            const { handicapIndex } = calculateHandicap(allRounds, player.low_handicap_index);

            const courseHandicap = getCourseHandicap(handicapIndex, (player as any).preferred_tee_box);

            // Calculate Points (same logic as Scores page - tournament placement based)
            let totalPoints = 0;
            const currentYear = new Date().getFullYear();

            player.rounds.forEach((rp: any) => {
                if (!rp.round.is_tournament || !rp.gross_score) return;

                const roundYear = parseInt(rp.round.date?.split('-')[0] || '0');
                if (roundYear !== currentYear) return;

                const par = rp.round.course.holes.reduce((sum: number, h: any) => sum + h.par, 0);

                // Sort players by index for flighting
                const sortedPlayers = [...rp.round.players].sort((a: any, b: any) => {
                    const idxA = a.index_at_time ?? a.player?.index ?? 0;
                    const idxB = b.index_at_time ?? b.player?.index ?? 0;
                    return idxA - idxB;
                });

                const half = Math.floor(sortedPlayers.length / 2);
                const flights = [
                    sortedPlayers.slice(0, half),
                    sortedPlayers.slice(half)
                ];

                // Find which flight this player is in
                flights.forEach((flight: any) => {
                    const scoredPlayers = flight.map((p: any) => {
                        if (!p.gross_score) return { ...p, net: 9999 };
                        const idx = p.index_at_time ?? p.player?.index ?? 0;
                        const slope = p.tee_box?.slope ?? 113;
                        const rating = p.tee_box?.rating ?? par;
                        const ch = Math.round(idx * (slope / 113) + (rating - par));
                        return { ...p, net: p.gross_score - ch, player_id: p.player_id };
                    }).sort((a: any, b: any) => a.net - b.net);

                    // Find this player's rank in their flight
                    const rank = scoredPlayers.findIndex((p: any) => p.player_id === player.id);
                    if (rank !== -1 && scoredPlayers[rank].net !== 9999) {
                        let pts = 20; // Participation
                        if (rank === 0) pts = 100; // 1st place
                        else if (rank === 1) pts = 75; // 2nd place
                        else if (rank === 2) pts = 50; // 3rd place
                        totalPoints += pts;
                    }
                });
            });

            const money = player.rounds.reduce((sum: number, r: any) => sum + (r.payout || 0), 0);

            return {
                ...player,
                firstName,
                lastName,
                liveIndex: handicapIndex,
                courseHandicap,
                roundCount: allRounds.length,
                points: totalPoints,
                money,
            };
        });

        // 2. Assign Rank based on Live Index (Low to High)
        // We sort by index to establish rank 1..N
        withStats.sort((a, b) => a.liveIndex - b.liveIndex);

        // 3. Map to add 'rank' property
        return withStats.map((p, i) => ({
            ...p,
            rank: i + 1
        }));

    }, [initialPlayers, course]);

    // Sorting & Filtering
    const displayedPlayers = useMemo(() => {
        let data = [...processedPlayers];

        // Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter((p: any) =>
                p.name.toLowerCase().includes(query) ||
                (p.email && p.email.toLowerCase().includes(query)) ||
                (p.phone && p.phone.includes(query))
            );
        }

        // Sort
        data.sort((a, b) => {
            let valA: any = 0; // Default to 0 for numbers
            let valB: any = 0;

            switch (sortConfig.key) {
                case 'last_name': valA = a.lastName.toLowerCase(); valB = b.lastName.toLowerCase(); break;
                case 'first_name': valA = a.firstName.toLowerCase(); valB = b.firstName.toLowerCase(); break;
                case 'hcp': valA = a.courseHandicap; valB = b.courseHandicap; break;
                case 'rank': valA = a.rank; valB = b.rank; break;
                case 'pts': valA = a.points; valB = b.points; break;
                case 'money': valA = a.money; valB = b.money; break;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return data;
    }, [processedPlayers, searchQuery, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortButton = ({ label, sortKey }: { label: string, sortKey: SortKey }) => (
        <button
            onClick={() => handleSort(sortKey)}
            className={`hover:text-black flex items-center gap-0.5 transition-colors ${sortConfig.key === sortKey ? 'text-black font-bold' : ''}`}
        >
            {label}
            {sortConfig.key === sortKey && (
                sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
            )}
        </button>
    );

    const handleCopyEmails = async () => {
        const emails = displayedPlayers
            .map((p: any) => p.email)
            .filter((email: any) => !!email)
            .join('; ');

        if (!emails) {
            alert('No emails found for the selected members.');
            return;
        }

        try {
            await navigator.clipboard.writeText(emails);
            alert('Emails copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy emails: ', err);
            alert('Failed to copy emails.');
        }
    };

    const handleCopyMembers = async () => {
        // Build Data Rows
        const rows = displayedPlayers.map((p: any) => {
            const yr = (p as any).year_joined || '-';
            const tee = (p as any).preferred_tee_box ? (p as any).preferred_tee_box.charAt(0) : 'W';
            return {
                nameLastBefore: p.lastName,
                nameFirst: p.firstName,
                tee,
                hcp: p.courseHandicap,
                index: p.liveIndex.toFixed(1),
                rank: p.rank,
                pts: p.points,
                yr
            };
        });

        // 1. Plain Text (Tab Separated)
        let text = `Name\tTee\tHcp\tIndex\tRank\tPts\tYr\n`;
        rows.forEach((r: any) => {
            text += `${r.nameLastBefore}, ${r.nameFirst}\t${r.tee}\t${r.hcp}\t${r.index}\t${r.rank}\t${r.pts}\t${r.yr}\n`;
        });

        // 2. HTML Table
        let html = `
        <div style="font-family: sans-serif;">
            <h2 style="margin-bottom: 10px;">Players List</h2>
            <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
                <thead>
                    <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0; text-align: center;">
                        <th style="padding: 8px; text-align: left;">Name</th>
                        <th style="padding: 8px;">Tee</th>
                        <th style="padding: 8px;">Hcp</th>
                        <th style="padding: 8px;">Index</th>
                        <th style="padding: 8px;">Rank</th>
                        <th style="padding: 8px;">Pts</th>
                        <th style="padding: 8px;">Yr</th>
                    </tr>
                </thead>
                <tbody>
        `;

        rows.forEach((r, idx) => {
            const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            html += `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0; text-align: center;">
                    <td style="padding: 6px; text-align: left;">
                        <b>${r.nameLastBefore}</b>, ${r.nameFirst}
                    </td>
                    <td style="padding: 6px;">${r.tee}</td>
                    <td style="padding: 6px; font-weight: bold; text-decoration: underline;">${r.hcp}</td>
                    <td style="padding: 6px;">${r.index}</td>
                    <td style="padding: 6px;">${r.rank}</td>
                    <td style="padding: 6px;">${r.pts}</td>
                    <td style="padding: 6px;">${r.yr}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;

        try {
            const blobHtml = new Blob([html], { type: 'text/html' });
            const blobText = new Blob([text], { type: 'text/plain' });
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText
                })
            ]);
            alert('Member list copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert('Failed to copy member list.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10 px-3 py-3">
                <div className="flex items-center justify-between">
                    <Link href="/" className="px-4 py-2 bg-black text-white rounded-full text-[16pt] font-bold hover:bg-gray-800 transition-colors">Back</Link>
                    <h1 className="text-[18pt] font-bold text-green-700 tracking-tight">Players</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopyMembers}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-[14pt] font-bold hover:bg-green-700 transition-all shadow-md active:scale-95"
                        >
                            <Copy size={20} />
                            <span>Copy</span>
                        </button>
                        <button
                            onClick={handleCopyEmails}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-[14pt] font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                        >
                            <Mail size={20} />
                            <span>Email</span>
                        </button>
                    </div>
                </div>

                {/* Search & Sort Bar */}
                <div className="mt-4 flex items-center gap-2">
                    <div className="flex gap-4 text-[16pt] font-bold text-gray-500 uppercase tracking-wide items-center overflow-x-auto">
                        <span className="shrink-0 text-gray-400">Sort:</span>
                        <SortButton label="Last" sortKey="last_name" />
                        <SortButton label="First" sortKey="first_name" />
                        <SortButton label="Rank" sortKey="rank" />
                        <SortButton label="YTD" sortKey="pts" />
                        <SortButton label="$" sortKey="money" />
                    </div>
                    <div className="ml-auto relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-3 pr-7 py-1 rounded-full border border-gray-300 text-[16pt] focus:outline-none focus:ring-1 focus:ring-green-500 w-32 sm:w-56"
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute right-2 top-1.5" />
                    </div>
                </div>
            </header>

            {/* Main List */}
            <main className="px-3 py-4 space-y-2">
                {displayedPlayers.map((player: any) => {
                    return (
                        <div key={player.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                            {/* Left: Identity & Contact - CLICKABLE */}
                            <div
                                className="flex-1 min-w-0 cursor-pointer group"
                                onClick={() => setSelectedPlayer(player)}
                            >
                                <div className="flex flex-col group-hover:opacity-80 transition-opacity">
                                    <span className="text-[16pt] font-bold text-blue-600 leading-tight underline decoration-red-500 decoration-2 underline-offset-2">
                                        {player.firstName}
                                    </span>
                                    <span className="text-[16pt] font-semibold text-black leading-tight">
                                        {player.lastName}
                                    </span>
                                </div>

                                <div className="mt-2 space-y-0.5 pointer-events-none">
                                    {player.phone && (
                                        <div className="flex items-center gap-1.5 text-[16pt] text-gray-500">
                                            <Phone className="w-3 h-3 text-gray-400" />
                                            <span>{player.phone}</span>
                                        </div>
                                    )}
                                    {player.email && (
                                        <div className="flex items-center gap-1.5 text-[16pt] text-gray-400 truncate max-w-[200px]">
                                            <Mail className="w-3 h-3 text-gray-300" />
                                            <span>{player.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Stats Grid */}
                            <div className="flex items-center gap-6 sm:gap-8 text-center shrink-0 w-full sm:w-auto overflow-x-auto">

                                {/* HCP (Playing Handicap) */}
                                <div className="flex flex-col items-center min-w-[30px]">
                                    <span className="text-[16pt] text-gray-400 uppercase font-bold tracking-wider">HCP</span>
                                    <span className="font-bold text-[16pt] text-black">
                                        {player.courseHandicap}
                                    </span>
                                </div>

                                {/* # (Rank) */}
                                <div className="flex flex-col items-center min-w-[30px]">
                                    <span className="text-[16pt] text-gray-400 uppercase font-bold tracking-wider">#</span>
                                    <span className="font-bold text-[16pt] text-black">
                                        {player.rank}
                                    </span>
                                </div>

                                {/* Tee */}
                                <div className="flex flex-col items-center min-w-[30px]">
                                    <span className="text-[16pt] text-gray-400 uppercase font-bold tracking-wider">Tee</span>
                                    <span className="font-bold text-[16pt] text-gray-500">
                                        {(player as any).preferred_tee_box ? (player as any).preferred_tee_box.charAt(0) : 'W'}
                                    </span>
                                </div>

                                {/* INDEX (Important) */}
                                <div
                                    className="flex flex-col items-center min-w-[40px] cursor-pointer hover:bg-green-50 rounded-lg p-1 transition-colors relative group"
                                    onClick={() => setSelectedHandicapPlayerId(player.id)}
                                >
                                    <span className="text-[16pt] text-gray-400 uppercase font-bold tracking-wider">IDX</span>
                                    <span className="font-bold text-[16pt] text-green-600 underline decoration-red-600 decoration-2 underline-offset-2 group-hover:text-green-800">
                                        {player.liveIndex.toFixed(1)}
                                    </span>
                                </div>

                                {/* YTD Points */}
                                <div className="flex flex-col items-center min-w-[30px]">
                                    <span className="text-[16pt] text-gray-400 uppercase font-bold tracking-wider">YTD</span>
                                    <span className="font-bold text-[16pt] text-green-600">{player.points}</span>
                                </div>

                                {/* Money */}
                                <div className="flex flex-col items-center min-w-[50px]">
                                    <span className="text-[16pt] text-gray-400 uppercase font-bold tracking-wider">$</span>
                                    <span className="font-bold text-[16pt] text-green-600">${player.money.toFixed(2)}</span>
                                </div>

                                {/* Edit Action */}
                                <button className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>

                        </div>
                    );
                })}
            </main>

            {/* Profile Modal */}
            {selectedPlayer && (
                <PlayerProfileModal
                    player={selectedPlayer}
                    isOpen={!!selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                    liveIndex={selectedPlayer.liveIndex}
                />
            )}

            {/* Handicap History Modal */}
            {selectedHandicapPlayerId && (
                <HandicapHistoryModal
                    playerId={selectedHandicapPlayerId}
                    isOpen={!!selectedHandicapPlayerId}
                    onClose={() => setSelectedHandicapPlayerId(null)}
                />
            )}
        </div>
    );
}


