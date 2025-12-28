import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const wayne = await prisma.player.findFirst({
        where: { name: 'Wayne Huth' }
    });

    if (!wayne) {
        return NextResponse.json({ error: 'Wayne not found' });
    }

    await prisma.player.update({
        where: { id: wayne.id },
        data: { index: 22.9 }
    });

    return NextResponse.json({
        success: true,
        message: 'Updated Wayne\'s index to 22.9',
        oldIndex: wayne.index,
        newIndex: 22.9
    });
}
