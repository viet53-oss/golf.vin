
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const rounds = await prisma.round.findMany({
        where: { date: { endsWith: '11-21' } },
        include: { course: true, players: { include: { player: true } } }
    });
    console.log(JSON.stringify(rounds, null, 2));
}

check().then(() => process.exit(0));
