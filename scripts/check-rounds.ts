import { prisma } from '../lib/prisma';

async function main() {
    const rounds = await prisma.liveRound.findMany({
        orderBy: { created_at: 'desc' },
        take: 5
    });
    console.log('RECORDS:', JSON.stringify(rounds, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
