
import { prisma } from '@/lib/prisma';
import PhotosClient from './PhotosClient';
import { cookies } from 'next/headers';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PhotosPage() {
    const photos = await prisma.photo.findMany({
        orderBy: { date: 'desc' },
        take: 15
    });
    console.log('Photos page fetched:', photos.length, 'photos');

    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10 px-3 py-3 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="px-4 py-2 bg-black text-white rounded-full text-[16pt] font-bold hover:bg-gray-800 transition-colors">Back</Link>
                    </div>
                    <h1 className="text-[16pt] font-bold text-green-600 tracking-tight">Club Photos</h1>
                </div>
            </header>

            <main className="px-3">
                <PhotosClient initialPhotos={photos} isAdmin={isAdmin} />
            </main>
        </div>
    );
}


