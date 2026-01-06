import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewCoursePage() {
    return (
        <div className="min-h-screen bg-white p-6 md:p-12 font-sans text-gray-900">
            <div className="max-w-5xl mx-auto mb-8 flex items-center justify-between">
                <Link href="/settings" className="flex items-center gap-2 text-sm font-bold bg-white border border-gray-300 px-1 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Settings
                </Link>
            </div>

            <div className="max-w-md mx-auto text-center space-y-4 pt-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <path d="M5 12h14" /><path d="M12 5v14" />
                    </svg>
                </div>
                <h1 className="text-2xl font-black tracking-tight">Create New Course</h1>
                <p className="text-gray-500">
                    Course creation functionality is not yet implemented.
                </p>
                <Link href="/settings" className="inline-block bg-black text-white px-6 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors">
                    Return to Settings
                </Link>
            </div>
        </div>
    );
}
