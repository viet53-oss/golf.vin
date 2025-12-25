import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'round_players'`;
        console.log('Columns in round_players:', columns);
        const hasInPool = (columns as any[]).some(c => c.column_name === 'in_pool');
        console.log('Has in_pool column:', hasInPool);
    } catch (err) {
        console.error('Error fetching round player:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
