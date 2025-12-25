import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
    // 1. Find the round on Dec 20, 2025
    // Use a date range or exact match if time is stripped.
    // The previous screenshot showed "Dec 20, 2025".
    const targetDate = '2025-12-20';
    // Actually the string might contain time if migrated from older system?
    // But schema says YYYY-MM-DD. Let's try exact match first.
    // Or filter manually.

    console.log('Searching for round on:', targetDate);

    // Find filtered
    const allRounds = await prisma.round.findMany({
        where: {
            date: { contains: '2025-12-20' }
        },
        include: {
            course: {
                include: { holes: true, tee_boxes: true }
            },
            players: {
                where: {
                    player: {
                        name: { contains: 'Michael' }
                    }
                },
                include: {
                    player: true,
                    tee_box: true
                }
            }
        }
    });

    if (allRounds.length === 0) {
        console.log('No rounds found matching 2025-12-20');
        return;
    }

    const round = allRounds[0];

    if (!round) {
        console.log('Round not found for Dec 20, 2025');
        return;
    }

    console.log(`Found Round: ${round.date} at ${round.course.name}`);
    const par = round.course.holes.reduce((sum, h) => sum + h.par, 0);
    console.log(`Course Par: ${par}`);

    const player = round.players[0];
    if (!player) {
        console.log('Michael not found in this round.');
        return;
    }

    console.log(`Player: ${player.player.name}`);

    // Handicap Calc Logic from page.tsx
    const index = player.index_at_time ?? player.player.index;
    const teeBox = player.tee_box || round.course.tee_boxes[0]; // Fallback
    const slope = teeBox.slope;
    const rating = teeBox.rating;

    console.log(`Index: ${index}`);
    console.log(`Tee: ${teeBox.name} (Slope: ${slope}, Rating: ${rating})`);

    // Course Handicap
    const courseHcpRaw = (index * (slope / 113)) + (rating - par);
    const courseHcp = Math.round(courseHcpRaw);

    console.log(`Detailed Calc: (${index} * ${slope}/113) + (${rating} - ${par})`);
    console.log(`Raw Course Hcp: ${courseHcpRaw.toFixed(4)}`);
    console.log(`Total Course Handicap (Rounded): ${courseHcp}`);

    // Split Logic
    const frontHcp = Math.round(courseHcp / 2);
    const backHcp = courseHcp - frontHcp;

    console.log('--- Split Logic ---');
    console.log(`Front Nine Shots: ${frontHcp}`);
    console.log(`Back Nine Shots: ${backHcp}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
