'use client';

import { useTransition } from 'react';
import { deleteCourse } from '@/app/actions/update-course';
import { useRouter } from 'next/navigation';

export default function DeleteCourseButton({ courseId, canDelete }: { courseId: string, canDelete: boolean }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleDelete = () => {
        // Removed confirm dialog for faster cleanup as requested
        // if (!confirm('Are you sure you want to delete this course permanently?')) return;

        startTransition(async () => {
            try {
                const result = await deleteCourse(courseId);
                if (result.success) {
                    router.refresh();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('An unexpected error occurred.');
                console.error(error);
            }
        });
    };

    if (!canDelete) {
        return null;
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-4 py-2 text-[15pt] rounded-lg transition-colors border border-red-200"
        >
            {isPending ? 'Deleting...' : 'Delete'}
        </button>
    );
}
