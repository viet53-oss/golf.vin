import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
        return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const holes = await prisma.hole.findMany({
        where: { course_id: courseId },
        orderBy: { hole_number: 'asc' },
    });

    return NextResponse.json(holes);
}
