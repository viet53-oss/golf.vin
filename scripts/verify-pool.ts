import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPool() {
    try {
        // Find the round for 1/3/2026
        const round = await prisma.round.findFirst({
            where: { date: '2026-01-03' },
            include: {
                course: {
                    include: { holes: true }
                },
                players: {
                    where: { in_pool: true },
                    include: {
                        player: true,
                        tee_box: true,
                        scores: {
                            include: { hole: true }
                        }
                    }
                }
            }
        });

        if (!round) {
            console.log('No round found for 2026-01-03');
            return;
        }

        console.log(`\n=== POOL VERIFICATION FOR ${round.date} ===\n`);
        console.log(`Total Pool Participants: ${round.players.length}`);
        console.log(`Total Pot: $${round.players.length * 5}\n`);

        // Find Ray
        const ray = round.players.find(p => p.player.name.includes('Ray'));

        if (!ray) {
            console.log('Ray not found in pool');
            return;
        }

        console.log(`\n=== RAY'S DETAILS ===`);
        console.log(`Name: ${ray.player.name}`);
        console.log(`Index at time: ${ray.index_at_time ?? ray.player.index}`);
        console.log(`Tee Box: ${ray.tee_box?.name} (Rating: ${ray.tee_box?.rating}, Slope: ${ray.tee_box?.slope})`);
        console.log(`Gross Score: ${ray.gross_score}`);
        console.log(`Front Nine: ${ray.front_nine}`);
        console.log(`Back Nine: ${ray.back_nine}`);

        // Calculate Course Handicap
        const index = ray.index_at_time ?? ray.player.index;
        const slope = ray.tee_box?.slope || 113;
        const rating = ray.tee_box?.rating || 72;
        const par = round.course?.holes.reduce((sum, h) => sum + h.par, 0) || 72;
        const courseHcp = Math.round((index * (slope / 113)) + (rating - par));

        console.log(`\nCalculated Course Handicap: ${courseHcp}`);

        // Calculate Front/Back Handicap
        let frontHcp = 0;
        let backHcp = 0;

        if (round.course?.holes) {
            round.course.holes.forEach(h => {
                const diff = h.difficulty || 18;
                const baseStrokes = Math.floor(courseHcp / 18);
                const remainder = courseHcp % 18;
                const extraStroke = diff <= remainder ? 1 : 0;
                const hcpStrokes = baseStrokes + extraStroke;

                if (h.hole_number <= 9) frontHcp += hcpStrokes;
                else backHcp += hcpStrokes;
            });
        }

        console.log(`Front 9 Handicap: ${frontHcp}`);
        console.log(`Back 9 Handicap: ${backHcp}`);

        const frontNet = (ray.front_nine ?? 0) - frontHcp;
        const backNet = (ray.back_nine ?? 0) - backHcp;
        const totalNet = (ray.gross_score ?? 0) - courseHcp;

        console.log(`\nFront 9 Net: ${ray.front_nine} - ${frontHcp} = ${frontNet}`);
        console.log(`Back 9 Net: ${backNet}`);
        console.log(`Total Net: ${totalNet}`);

        // Show all front 9 scores sorted
        console.log(`\n=== ALL FRONT 9 SCORES (sorted by net) ===`);
        const allScores = round.players.map(rp => {
            const idx = rp.index_at_time ?? rp.player.index;
            const slp = rp.tee_box?.slope || 113;
            const rtg = rp.tee_box?.rating || par;
            const ch = Math.round((idx * (slp / 113)) + (rtg - par));

            let fHcp = 0;
            if (round.course?.holes) {
                round.course.holes.forEach(h => {
                    const diff = h.difficulty || 18;
                    const baseStrokes = Math.floor(ch / 18);
                    const remainder = ch % 18;
                    const extraStroke = diff <= remainder ? 1 : 0;
                    const hcpStrokes = baseStrokes + extraStroke;
                    if (h.hole_number <= 9) fHcp += hcpStrokes;
                });
            }

            return {
                name: rp.player.name,
                frontGross: rp.front_nine ?? 0,
                frontHcp: fHcp,
                frontNet: (rp.front_nine ?? 0) - fHcp
            };
        }).sort((a, b) => a.frontNet - b.frontNet);

        allScores.forEach((s, i) => {
            console.log(`${i + 1}. ${s.name}: ${s.frontGross} - ${s.frontHcp} = ${s.frontNet}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyPool();
