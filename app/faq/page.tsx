import { prisma } from '@/lib/prisma';
import FAQClient from '@/components/FAQClient';

export const dynamic = 'force-dynamic';

export default async function FAQPage() {
    const players = await prisma.player.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            handicapIndex: true,
        }
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-3">
            <FAQClient players={players.map(p => ({ ...p, index: p.handicapIndex }))} />
        </div>
    );
}
