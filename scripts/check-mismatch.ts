import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function checkGrossSumMismatch() {
    console.log('Checking for Gross Score vs Sum of Strokes mismatch...\n');

    const rounds = await prisma.roundPlayer.findMany({
        include: {
            scores: {
                include: { hole: true }
            },
            player: true,
            round: true
        }
    });

    let mismatches = 0;

    for (const r of rounds) {
        if (!r.scores || r.scores.length === 0) continue;

        const sumStrokes = r.scores.reduce((sum, s) => sum + s.strokes, 0);

        // Calculate Adjusted (Par + 2)
        let adjSum = 0;
        let adjustments = 0;
        for (const s of r.scores) {
            const max = s.hole.par + 2;
            const holeAdj = Math.min(s.strokes, max);
            adjSum += holeAdj;
            if (holeAdj < s.strokes) adjustments++;
        }

        if (sumStrokes !== r.gross_score) {
            console.log(`Mismatch ${r.player.name} (${r.round.date}):`);
            console.log(`  DB Gross: ${r.gross_score}`);
            console.log(`  Sum Strokes: ${sumStrokes}`);
            console.log(`  DB Adj:   ${r.adjusted_gross_score}`);
            console.log(`  Calc Adj: ${adjSum} (${adjustments} holes capped)`);
            mismatches++;
        } else if (adjustments > 0 && r.gross_score === r.adjusted_gross_score) {
            console.log(`Logic Error ${r.player.name} (${r.round.date}):`);
            console.log(`  DB Gross == DB Adj == ${r.gross_score}`);
            console.log(`  But Calc Adj should be ${adjSum} (Sum Strokes ${sumStrokes})`);
            // This would happen if DB Gross was correct (equal to sum), but we failed to update DB Adj?
            // Or if we updated DB Adj but DB Gross was inexplicably lowered?
        }
    }

    console.log(`\nFound ${mismatches} mismatches between DB Gross and Sum of Strokes.`);
}

checkGrossSumMismatch()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
