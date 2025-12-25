import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { calculateAdjustedGrossScore } from '../lib/adjusted-score';
import { calculateScoreDifferential } from '../lib/handicap';

async function updateAdjustedScores() {
    console.log('Starting adjusted score update (Par + 2 Rule)...\n');

    const roundPlayers = await prisma.roundPlayer.findMany({
        include: {
            scores: {
                include: {
                    hole: true
                }
            },
            tee_box: true,
            round: true,
            player: true
        }
    });

    console.log(`Found ${roundPlayers.length} round records to check.`);

    let updatedCount = 0;
    let skippedNoScores = 0;
    let skippedNoTeeBox = 0;

    for (const rp of roundPlayers) {
        // Skip if no per-hole scores
        if (!rp.scores || rp.scores.length === 0) {
            skippedNoScores++;
            continue;
        }

        // 1. Calculate new adjusted score
        const holeScores = rp.scores.map(s => ({
            holeNumber: s.hole.hole_number,
            par: s.hole.par,
            strokes: s.strokes
        }));

        const { adjustedGrossScore } = calculateAdjustedGrossScore(holeScores);

        // 2. Calculate new differential
        let newDifferential = rp.score_differential;
        let updateDifferential = false;

        if (rp.tee_box) {
            const { rating, slope } = rp.tee_box;
            newDifferential = calculateScoreDifferential(adjustedGrossScore, rating, slope, 0);
            updateDifferential = true;
        } else {
            skippedNoTeeBox++;
        }

        // 3. Update if needed
        // Compare with existing values. Be careful with nulls.
        const currentAdj = rp.adjusted_gross_score;
        const currentDiff = rp.score_differential;

        // Check if values changed significantly
        const adjChanged = currentAdj !== adjustedGrossScore;
        const diffChanged = updateDifferential && (currentDiff === null || Math.abs(currentDiff - newDifferential) > 0.001);

        if (adjChanged || diffChanged) {
            console.log(`Updating ${rp.player.name} (${rp.round.date}):`);
            if (adjChanged) console.log(`  Adj: ${currentAdj} -> ${adjustedGrossScore}`);
            if (diffChanged) console.log(`  Diff: ${currentDiff} -> ${newDifferential}`);

            await prisma.roundPlayer.update({
                where: { id: rp.id },
                data: {
                    adjusted_gross_score: adjustedGrossScore,
                    score_differential: updateDifferential ? newDifferential : undefined
                }
            });
            updatedCount++;
        }
    }

    console.log(`\nMigration complete!`);
    console.log(`Checked: ${roundPlayers.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped (No Scores): ${skippedNoScores}`);
    console.log(`Skipped (No Tee Box): ${skippedNoTeeBox} (Note: Some rounds might be processed for AdjScore but not Diff if TeeBox missing)`);
}

updateAdjustedScores()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
