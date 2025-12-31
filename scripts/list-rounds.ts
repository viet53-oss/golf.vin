import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function listRounds() {
    try {
        const rounds = await prisma.round.findMany({
            orderBy: { date: 'desc' },
            take: 10,
            select: {
                id: true,
                date: true,
                name: true,
                _count: {
                    select: { players: true }
                }
            }
        });

        console.log('\n=== Recent Rounds ===\n');
        rounds.forEach(r => {
            console.log(`${r.date} - ${r.name || 'Unnamed'} (${r._count.players} players) - ID: ${r.id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listRounds();
