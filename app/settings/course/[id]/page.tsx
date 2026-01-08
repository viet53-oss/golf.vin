import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import CourseViewModal from './CourseViewModal';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    const course = await prisma.course.findUnique({
        where: { id },
        include: {
            tee_boxes: { orderBy: { name: 'desc' } },
            holes: { orderBy: { hole_number: 'asc' } }
        }
    });

    if (!course) notFound();

    return <CourseViewModal course={course} isAdmin={isAdmin} />;
}
