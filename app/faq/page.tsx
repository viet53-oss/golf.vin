import { prisma } from '@/lib/prisma';
import FAQClient from '@/components/FAQClient';

export default async function FAQPage() {
    const players = await prisma.player.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            index: true,
        }
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            <FAQClient players={players} />
        </div>
    );
}
