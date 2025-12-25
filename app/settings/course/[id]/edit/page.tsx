
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EditCourseClient from './EditCourseClient';

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const course = await prisma.course.findUnique({
        where: { id },
        include: {
            tee_boxes: { orderBy: { name: 'desc' } },
            holes: { orderBy: { hole_number: 'asc' } }
        }
    });

    if (!course) notFound();

    return <EditCourseClient initialCourse={course} />;
}
