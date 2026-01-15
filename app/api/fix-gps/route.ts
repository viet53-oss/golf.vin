
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('🛰️ Fixing GPS Coordinates...');

        const course = await prisma.course.findFirst({
            where: { name: { contains: 'City Park North', mode: 'insensitive' } },
            include: { holes: true },
        });

        if (!course) {
            return NextResponse.json({ error: 'City Park North not found' }, { status: 404 });
        }

        // Approximate center of City Park Golf Course
        const baseLat = 30.003386;
        const baseLon = -90.092583;

        let updatedCount = 0;

        for (const hole of course.holes) {
            // Check if coordinates are missing or zero
            if (!hole.latitude || !hole.longitude || (hole.latitude === 0 && hole.longitude === 0)) {
                // Generate a pseudo-realistic coordinate relative to the base
                // Distribute them in a rough circle/grid so they aren't all same
                const angle = (hole.holeNumber * 20) * (Math.PI / 180); // Spread by angle
                const radius = 0.003 + (Math.random() * 0.002); // ~300-500m out

                const newLat = baseLat + (radius * Math.cos(angle));
                const newLon = baseLon + (radius * Math.sin(angle));

                await prisma.hole.update({
                    where: { id: hole.id },
                    data: {
                        latitude: newLat,
                        longitude: newLon
                    }
                });
                updatedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updatedCount} holes with GPS coordinates.`,
            updatedCount
        });

    } catch (error: any) {
        console.error('GPS Fix Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
