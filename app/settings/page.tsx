import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Settings, Shield, Globe, Database, PenTool, MapPin } from 'lucide-react';
import Link from 'next/link';
import RecalculateButton from './RecalculateButton';
import BackupManager from './BackupManager';
import MetaTagEditor from './MetaTagEditor';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    if (!isAdmin) {
        redirect('/');
    }

    const courses = await prisma.course.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10 px-3 py-3 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="px-4 py-2 bg-black text-white rounded-full text-[16pt] font-bold hover:bg-gray-800 transition-colors">Back</Link>
                    </div>
                    <h1 className="text-[16pt] font-bold text-gray-900 tracking-tight">System Settings</h1>
                </div>
            </header>

            <main className="px-3 space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* USGA Handicap System */}
                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
                        <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            <h2 className="font-bold text-blue-900">USGA Handicap System</h2>
                        </div>
                        <div className="p-3 space-y-4">
                            <p className="text-[16pt] text-gray-500">
                                Recalculate player handicaps using WHS rules. This will scan all rounds and update the Handicap Index for all players.
                            </p>
                            <RecalculateButton />
                        </div>
                    </div>

                    {/* Site Configuration */}
                    <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
                        <div className="p-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-purple-600" />
                            <h2 className="font-bold text-purple-900">Site Configuration</h2>
                        </div>
                        <div className="p-3 space-y-4">
                            <p className="text-[16pt] text-gray-500">
                                Manage global SEO settings and meta tags. Update the site title, description, and keywords.
                            </p>
                            <MetaTagEditor />
                        </div>
                    </div>

                </div>

                {/* Courses */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-gray-700" />
                        <h2 className="font-bold text-gray-900">Courses</h2>
                    </div>
                    <div className="p-3 space-y-4">
                        {courses.map(course => (
                            <div key={course.id} className="border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                                <h3 className="font-bold text-[16pt]">{course.name}</h3>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <Link href={`/settings/course/${course.id}`} className="flex-1 md:flex-none bg-black text-white px-8 py-2 rounded-full font-bold text-[16pt] text-center hover:bg-gray-800 transition-colors">
                                        View
                                    </Link>
                                    <Link href={`/settings/course/${course.id}/edit`} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-[16pt] hover:bg-gray-50 transition-colors shadow-sm">
                                        Edit
                                    </Link>
                                </div>
                            </div>
                        ))}
                        {courses.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-[16pt]">No courses found.</div>
                        )}
                    </div>
                </div>

                {/* Backup & Restore */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <Database className="w-5 h-5 text-gray-700" />
                        <h2 className="font-bold text-gray-900">Data Backup & Restore</h2>
                    </div>
                    <div className="p-3">
                        <p className="text-[16pt] text-gray-500 mb-4">
                            Download a backup of all your data to protect against data loss.
                        </p>
                        <BackupManager />
                    </div>
                </div>

            </main>
        </div>
    );
}


