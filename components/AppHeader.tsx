'use client';

import { useState, useEffect } from 'react';
// Native SVG Icons to bypass Lucide/Turbopack crash
const ShieldIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .52-.88l7-4a1 1 0 0 1 .96 0l7 4A1 1 0 0 1 20 6v7z" /><path d="m9 12 2 2 4-4" />
    </svg>
);

const LogOutIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
    </svg>
);

const LogInIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" />
    </svg>
);
import Cookies from 'js-cookie';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppHeader() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    // Check login status on mount
    useEffect(() => {
        const adminCookie = Cookies.get('admin_session');
        if (adminCookie === 'true') {
            setIsAdmin(true);
        }
    }, []);

    const handleLoginClick = () => {
        setShowLoginModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === 'cpgc-V') {
            Cookies.set('admin_session', 'true', { expires: 7 });
            setIsAdmin(true);
            setShowLoginModal(false);
        } else {
            alert('Incorrect Password');
        }
    };

    const handleLogout = () => {
        Cookies.remove('admin_session');
        setIsAdmin(false);
        window.location.reload();
    };

    return (
        <>
            <div className="bg-black text-white py-1 flex justify-between items-center relative z-[100] mx-3 rounded-full mt-2 shadow-xl border border-white/10">
                <div className="flex items-center gap-2 px-3">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
                        <span role="img" aria-label="golf" className="text-xl">⛳</span>
                        <span className="font-bold tracking-tight text-[18pt]">City Park Golf Club</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4 px-3">
                    {isAdmin ? (
                        <div className="flex items-center gap-3">
                            <span className="text-green-400 font-bold flex items-center gap-1 text-[10pt] uppercase tracking-wider">
                                <ShieldIcon className="w-4 h-4" />
                                Admin
                            </span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-full text-[10pt] font-bold transition-colors"
                            >
                                <LogOutIcon className="w-3 h-3" />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLoginClick}
                            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-full text-[10pt] font-bold transition-colors"
                        >
                            <LogInIcon className="w-3 h-3" />
                            Login
                        </button>
                    )}
                </div>
            </div>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-3">
                    <div className="bg-white text-black p-3 rounded-lg shadow-2xl w-full">
                        <h3 className="font-bold text-lg mb-4">Admin Access</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input
                                    type="password"
                                    autoFocus
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-black focus:ring-black border p-2 text-[12pt] sm:text-[15pt]"
                                    placeholder="Enter password"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowLoginModal(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-black text-white rounded text-sm font-bold hover:bg-gray-800"
                                >
                                    Login
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
