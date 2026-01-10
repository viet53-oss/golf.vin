
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
            <header className="bg-white shadow-sm sticky top-0 z-50 px-1 py-3 mb-6">
                <div className="flex items-center justify-between p-1">
                    <h1 className="text-[18pt] font-bold text-green-600 tracking-tight text-left ml-3">Photos</h1>
                    <Link href="/" className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95">Home</Link>
                </div>
            </header>

            <main className="px-1">
                <PhotosClient initialPhotos={photos} isAdmin={isAdmin} />
            </main>
        </div>
    );
}


