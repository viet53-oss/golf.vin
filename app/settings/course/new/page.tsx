import EditCourseClient from '../[id]/edit/EditCourseClient';

export default function NewCoursePage() {
    // 4 blank tee boxes
    const blankTees = Array.from({ length: 4 }).map((_, i) => ({
        id: `temp-tee-${i}`,
        name: '',
        rating: 0,
        slope: 0
    }));

    // 18 blank holes (default par 4)
    const blankHoles = Array.from({ length: 18 }).map((_, i) => ({
        id: `temp-hole-${i}`,
        hole_number: i + 1,
        par: 4,
        difficulty: null
    }));

    const initialCourse = {
        id: 'new',
        name: '',
        tee_boxes: blankTees,
        holes: blankHoles
    };

    return <EditCourseClient initialCourse={initialCourse} isNew={true} />;
}
