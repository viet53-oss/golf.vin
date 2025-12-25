import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { calculateAdjustedGrossScore } from '../lib/adjusted-score';
import { calculateScoreDifferential } from '../lib/handicap';

async function fixGrossScores() {
    console.log('Starting Gross Score Fix (Setting Gross = Sum of Strokes)...\n');

    const rounds = await prisma.roundPlayer.findMany({
        include: {
            scores: {
                include: { hole: true }
            },
            player: true,
            round: true,
            tee_box: true
        }
    });

    let updated = 0;

    for (const r of rounds) {
        // Only process if we have hole scores
        if (!r.scores || r.scores.length === 0) continue;

        const sumStrokes = r.scores.reduce((sum, s) => sum + s.strokes, 0);

        // Recalculate Adjusted from scratch to be safe
        const holeScores = r.scores.map(s => ({
            holeNumber: s.hole.hole_number,
            par: s.hole.par,
            strokes: s.strokes
        }));
        const { adjustedGrossScore } = calculateAdjustedGrossScore(holeScores);

        // Recalculate Differential if we have tee box
        let newDiff = r.score_differential;
        if (r.tee_box) {
            const { rating, slope } = r.tee_box;
            newDiff = calculateScoreDifferential(adjustedGrossScore, rating, slope, 0);
        }

        // We only update if Gross is wrong OR Adjusted/Diff needs a refresh
        const grossChanged = r.gross_score !== sumStrokes;
        const adjChanged = r.adjusted_gross_score !== adjustedGrossScore;
        const diffChanged = (r.score_differential !== newDiff);

        if (grossChanged || adjChanged || diffChanged) {
            console.log(`Fixing ${r.player.name} (${r.round.date}):`);
            if (grossChanged) console.log(`  Gross: ${r.gross_score} -> ${sumStrokes}`);
            if (adjChanged) console.log(`  Adj:   ${r.adjusted_gross_score} -> ${adjustedGrossScore}`);

            await prisma.roundPlayer.update({
                where: { id: r.id },
                data: {
                    gross_score: sumStrokes,
                    adjusted_gross_score: adjustedGrossScore,
                    score_differential: newDiff
                }
            });
            updated++;
        }
    }

    console.log(`\nFixed ${updated} rounds.`);
}

fixGrossScores()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
