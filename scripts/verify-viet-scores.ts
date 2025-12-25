import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function verifyVietScores() {
    const player = await prisma.player.findFirst({
        where: { name: { contains: 'Viet', mode: 'insensitive' } }
    });

    if (!player) {
        console.log('Player Viet not found');
        return;
    }

    console.log(`Checking scores for ${player.name}...`);

    const rounds = await prisma.roundPlayer.findMany({
        where: { player_id: player.id },
        include: {
            round: true,
            tee_box: true,
            scores: {
                include: { hole: true }
            }
        },
        orderBy: { round: { date: 'desc' } }
    });

    for (const r of rounds) {
        console.log(`\nDate: ${r.round.date} | Box: ${r.tee_box?.name || 'MISSING'}`);
        console.log(`Gross: ${r.gross_score} | Adj: ${r.adjusted_gross_score} | Diff: ${r.score_differential}`);

        if (r.scores.length > 0) {
            let calcedAdj = 0;
            let holesAdj = 0;
            for (const s of r.scores) {
                const max = s.hole.par + 2;
                const adj = Math.min(s.strokes, max);
                calcedAdj += adj;
                if (adj < s.strokes) holesAdj++;
            }
            console.log(`Re-calc Adj (Par+2): ${calcedAdj} (${holesAdj} holes cap)`);

            if (calcedAdj !== r.adjusted_gross_score) {
                console.log('❌ MISMATCH!');
            } else {
                console.log('✅ Match');
            }
        } else {
            console.log('No hole scores available.');
        }
    }
}

verifyVietScores()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
