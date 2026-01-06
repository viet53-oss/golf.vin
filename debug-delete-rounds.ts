import 'dotenv/config';
import { prisma } from './lib/prisma';

async function main() {
    console.log('Fetching live rounds...');
    const rounds = await prisma.liveRound.findMany();
    console.log(`Found ${rounds.length} live rounds.`);
    for (const r of rounds) {
        console.log(`- ${r.name} (${r.date})`);
    }

    if (rounds.length > 0) {
        console.log('Deleting all live rounds...');
        const result = await prisma.liveRound.deleteMany();
        console.log(`Deleted ${result.count} rounds.`);
    }
}

main().catch(console.error).finally(() => process.exit());
