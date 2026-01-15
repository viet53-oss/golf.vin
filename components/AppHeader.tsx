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
import { usePathname, useRouter } from 'next/navigation';
import AuthModal from './AuthModal';
import { logout } from '@/app/actions/auth';

export default function AppHeader() {
    const router = useRouter(); // Initialize router
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false); // Admin modal
    const [passwordInput, setPasswordInput] = useState('');

    // User Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        const session = Cookies.get('admin_session');
        setIsAdmin(session === 'true');

        const authStatus = Cookies.get('auth_status');
        setIsAuthenticated(authStatus === 'true');
    }, []);

    const handleLoginClick = () => {
        setIsAdmin(false); // Reset to ensure clean state
        setShowLoginModal(true);
        setPasswordInput('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === 'Vaa') {
            Cookies.set('admin_session', 'true', { expires: 1 }); // 1 day session
            setIsAdmin(true);
            setShowLoginModal(false);
            window.location.reload(); // Refresh to apply admin state globally
        } else {
            alert('Incorrect password');
        }
    };

    const handleLogout = () => {
        Cookies.remove('admin_session');
        setIsAdmin(false);
        window.location.reload(); // Refresh to clear admin state globally
    };

    // Server action import needs to be handled carefully in client component.
    // We can't import server action directly if it's not passed as prop or imported from a file marked 'use server'.
    // 'auth.ts' is marked 'use server', so it's fine.

    // However, for logout, we need to invoke it.
    const handleUserLogout = async () => {
        // We need to dinamically import or assume it's available.
        // Since we can't change imports easily with replace_file_content if they are top level...
        // Wait, I can add imports at the top.
        // But this tool only replaces a chunk.
        // I'll need to use multi_replace to add imports AND update the body.
        // For now, I'll assume I can add the import in a separate chunk.
    }

    return (
        <>
            <div className="bg-black text-white py-1 flex justify-between items-center relative z-[100] mx-1 rounded-full mt-2 shadow-xl border border-white/10">
                {/* Left side: Logo */}
                <div className="flex items-center gap-2 px-1">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
                        <span role="img" aria-label="golf" className="text-xl">⛳</span>
                        <span className="font-bold tracking-tight text-[18pt] hidden sm:inline">GolfLS</span>
                    </Link>
                </div>

                {/* Center: Removed redundant logout button */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                </div>

                <div className="flex items-center gap-4 px-1">
                    {/* User Auth */}
                    {!isAuthenticated && (
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="bg-[#1a4d2e] hover:bg-[#143d24] text-white px-4 py-1.5 rounded-full text-[14pt] font-bold transition-colors"
                        >
                            Sign In
                        </button>
                    )}

                    {isAdmin ? (
                        <div className="flex items-center gap-3">
                            <span className="text-green-400 font-bold flex items-center gap-1 text-[14pt] uppercase tracking-wider">
                                <ShieldIcon className="w-4 h-4" />
                                Logout
                            </span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-1 py-1.5 rounded-full text-[14pt] font-bold transition-colors"
                            >
                                <LogOutIcon className="w-3 h-3" />
                                Logout
                            </button>
                        </div>
                    ) : isAuthenticated ? (
                        <form action={logout}>
                            <button
                                type="submit"
                                className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-1 py-1.5 rounded-full text-[14pt] font-bold transition-colors"
                            >
                                <LogOutIcon className="w-3 h-3" />
                                Logout
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={handleLoginClick}
                            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-1 py-1.5 rounded-full text-[14pt] font-bold transition-colors"
                        >
                            <LogOutIcon className="w-3 h-3" />
                            Logout
                        </button>
                    )}
                </div>
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

            {/* Login Modal (Admin) */}
            {showLoginModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white text-black p-6 rounded-2xl shadow-2xl w-full max-w-sm">
                        <h3 className="font-bold text-[15pt] mb-4 text-center">Admin Access</h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[15pt] font-bold text-gray-700 mb-2">Password</label>
                                <input
                                    type="password"
                                    autoFocus
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-black focus:ring-black border p-3 text-[15pt]"
                                    placeholder="Enter password"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowLoginModal(false)}
                                    className="px-4 py-2 text-[15pt] font-bold text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
