
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EditCourseClient from './EditCourseClient';

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const course = await prisma.course.findUnique({
        where: { id },
        include: {
            teeBoxes: { orderBy: { rating: 'desc' } },
            holes: {
                orderBy: { holeNumber: 'asc' },
                // include: { elements: true } // Removed from schema
            }
        }
    });

    if (!course) notFound();

    return <EditCourseClient initialCourse={course} />;
}
