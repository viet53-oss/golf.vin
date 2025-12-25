
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:Viet65Adam05@db.murcnbooxfuosrpdgyyb.supabase.co:5432/postgres"
        },
    },
});

async function check() {
    // Check for round on Nov 21
    const rounds = await prisma.round.findMany({
        where: { date: { contains: '11-21' } },
        include: { course: true, players: { include: { player: true } } }
    });
    console.log('Rounds found for 11-21:', rounds.length);
    rounds.forEach(r => {
        console.log(`- Round ID: ${r.id}, Date: ${r.date}, Tournament: ${r.is_tournament}, Course: ${r.course.name}`);
        console.log(`  Players: ${r.players.length}`);
    });

    if (rounds.length > 0) {
        // If it's 11/21 and not marked as tournament, maybe they want it marked?
        // Or they just want to see it.
    } else {
        console.log('No round found for 11/21.');
    }
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());
