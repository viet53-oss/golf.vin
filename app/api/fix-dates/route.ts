import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        console.log('Starting date timezone fix...');

        // Get all rounds
        const rounds = await prisma.round.findMany();

        console.log(`Found ${rounds.length} rounds to check`);

        let updated = 0;
        let skipped = 0;
        const results: string[] = [];

        for (const round of rounds) {
            // Check if date already has time component
            if (round.date.includes('T')) {
                skipped++;
                continue;
            }

            // Append T12:00:00 to prevent timezone issues
            const fixedDate = `${round.date}T12:00:00`;

            await prisma.round.update({
                where: { id: round.id },
                data: { date: fixedDate }
            });

            const msg = `✅ Fixed round ${round.id}: ${round.date} → ${fixedDate}`;
            console.log(msg);
            results.push(msg);
            updated++;
        }

        console.log(`\nDate fix complete!`);
        console.log(`  Updated: ${updated}`);
        console.log(`  Already correct: ${skipped}`);

        return NextResponse.json({
            success: true,
            updated,
            skipped,
            total: rounds.length,
            results
        });

    } catch (error) {
        console.error('Error fixing dates:', error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
