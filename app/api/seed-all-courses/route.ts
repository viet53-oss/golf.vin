import { NextResponse } from 'next/server';

export async function POST() {
    try {
        console.log('🏌️ Adding all courses...\n');

        const courses = [
            { name: 'Audubon Golf', endpoint: '/api/seed-audubon' },
            { name: 'Bartholomew', endpoint: '/api/seed-bartholomew' },
            { name: 'City Park South', endpoint: '/api/seed-city-park-south' },
            { name: 'English Turn', endpoint: '/api/seed-english-turn' },
            { name: 'Stonebridge Golf', endpoint: '/api/seed-stonebridge' },
            { name: 'Timberlane Golf', endpoint: '/api/seed-timberlane' },
        ];

        const results = [];
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        for (const course of courses) {
            console.log(`Adding ${course.name}...`);

            try {
                const response = await fetch(`${baseUrl}${course.endpoint}`, {
                    method: 'POST',
                });

                const data = await response.json();
                results.push({
                    course: course.name,
                    success: data.success,
                    message: data.message || data.error,
                });

                console.log(`✅ ${course.name}: ${data.message || data.error}`);
            } catch (error: any) {
                results.push({
                    course: course.name,
                    success: false,
                    message: error.message,
                });
                console.log(`❌ ${course.name}: ${error.message}`);
            }
        }

        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
            success: true,
            message: `Added ${successCount} out of ${courses.length} courses`,
            results,
        });

    } catch (error: any) {
        console.error('Error adding courses:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
