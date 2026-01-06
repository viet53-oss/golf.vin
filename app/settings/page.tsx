import { cookies } from 'next/headers';
import Link from 'next/link';
import RecalculateButton from './RecalculateButton';
import FixLowIndexButton from './FixLowIndexButton';
import BackupManager from './BackupManager';
import MetaTagEditor from './MetaTagEditor';
import AppLogicButton from './AppLogicButton';
import { prisma } from '@/lib/prisma';
import ManualScoreForm from './ManualScoreForm';
import DeleteCourseButton from '@/components/DeleteCourseButton';

// Native SVG components for settings/page.tsx
const SettingsIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
    </svg>
);

const DatabaseIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12V19A9 3 0 0 0 21 19V12" />
    </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 12.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" /><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    </svg>
);

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Access Denied</h1>
                        <p className="text-gray-500 text-[14pt]">You must be logged in as an administrator to access system settings.</p>
                    </div>
                    <div className="pt-4 space-y-3">
                        <p className="text-gray-400 text-xs italic text-[14pt]">Please use the 'Login' button at the top of the page to authenticate.</p>
                        <Link href="/" className="block w-full py-3 bg-black text-white rounded-full font-bold text-[14pt] hover:bg-gray-800 transition-all active:scale-95">Return Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    const courses = await prisma.course.findMany({
        include: {
            tee_boxes: true,
            holes: true,
            _count: {
                select: { rounds: true, live_rounds: true }
            }
        },
        orderBy: { name: 'asc' }
    });

    const players = await prisma.player.findMany({
        select: {
            id: true,
            name: true,
            preferred_tee_box: true
        },
        orderBy: { name: 'asc' }
    });

    // Calculate course par (assuming first course)
    const coursePar = courses[0]?.holes.reduce((sum, h) => sum + h.par, 0) || 72;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50 px-1 py-3 mb-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-[16pt] font-bold text-gray-900 tracking-tight">System Settings</h1>
                    <Link href="/" className="px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors">Home</Link>
                </div>
            </header>

            <main className="m-1 space-y-6">

                {/* USGA Handicap System */}
                {/* USGA Handicap System */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-black overflow-hidden">
                    <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                        <ShieldIcon className="w-5 h-5 text-blue-600" />
                        <h2 className="font-bold text-blue-900 text-[14pt]">USGA Handicap System</h2>
                    </div>
                    <div className="p-3 space-y-4">
                        <p className="text-[14pt] text-gray-500">
                            Recalculate player handicaps using WHS rules. This will scan all rounds and update the Handicap Index for all players.
                        </p>
                        <RecalculateButton />
                        <div className="pt-2 border-t border-gray-200">
                            <p className="text-[14pt] text-orange-600 font-bold mb-2">⚠️ Emergency Fix</p>
                            <p className="text-[14pt] text-gray-500 mb-3">
                                If all handicaps are showing as 0, click this button to reset the low handicap indexes.
                            </p>
                            <FixLowIndexButton />
                        </div>
                    </div>
                </div>

                {/* Courses */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-black overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPinIcon className="w-5 h-5 text-gray-700" />
                            <h2 className="font-bold text-gray-900 text-[14pt]">Courses</h2>
                        </div>
                        <Link href="/settings/course/new" className="px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                                <path d="M12 5v14" />
                            </svg>
                            Add Course
                        </Link>
                    </div>
                    <div className="p-3 space-y-4">
                        {courses.map((course: any) => {
                            const canDelete = course._count.rounds === 0 && course._count.live_rounds === 0;
                            return (
                                <div key={course.id} className="border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                                    <div>
                                        <h3 className="font-bold text-[14pt]">{course.name}</h3>
                                        {!canDelete && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                {course._count.rounds} Rounds • {course._count.live_rounds} Live
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <Link href={`/settings/course/${course.id}/edit`} className="flex-1 md:flex-none px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors text-center">
                                            Edit
                                        </Link>
                                        {canDelete && (
                                            <DeleteCourseButton courseId={course.id} canDelete={true} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {courses.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-[14pt]">No courses found.</div>
                        )}
                    </div>
                </div>

                {/* App Logic & Rules */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-black overflow-hidden">
                    <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                        </svg>
                        <h2 className="font-bold text-blue-900 text-[14pt]">App Logic & Rules</h2>
                    </div>
                    <div className="p-3 space-y-4">
                        <p className="text-[14pt] text-gray-500">
                            View detailed documentation about the app's internal logic, scoring rules, and calculations.
                        </p>
                        <AppLogicButton />
                    </div>
                </div>

                {/* Backup & Restore */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-black overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <DatabaseIcon className="w-5 h-5 text-gray-700" />
                        <h2 className="font-bold text-gray-900 text-[14pt]">Data Backup & Restore</h2>
                    </div>
                    <div className="p-3">
                        <p className="text-[14pt] text-gray-500 mb-4">
                            Download a backup of all your data to protect against data loss.
                        </p>
                        <BackupManager />
                    </div>
                </div>

                {/* Manual Score Entry */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-black overflow-hidden">
                    <div className="p-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="12" y1="18" x2="12" y2="12" />
                            <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                        <h2 className="font-bold text-green-900 text-[14pt]">Manual Score for Player</h2>
                    </div>
                    <div className="p-3">
                        <p className="text-[14pt] text-gray-500 mb-4">
                            Add a past score for a player. This is useful for importing historical rounds or scores from other courses.
                        </p>
                        <ManualScoreForm players={players} course={courses[0]} coursePar={coursePar} />
                    </div>
                </div>

                {/* Site Configuration */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-black overflow-hidden">
                    <div className="p-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
                        <GlobeIcon className="w-5 h-5 text-purple-600" />
                        <h2 className="font-bold text-purple-900 text-[14pt]">Site Configuration</h2>
                    </div>
                    <div className="p-3 space-y-4">
                        <p className="text-[14pt] text-gray-500">
                            Manage global SEO settings and meta tags. Update the site title, description, and keywords.
                        </p>
                        <MetaTagEditor />
                    </div>
                </div>

            </main>
        </div>
    );
}
