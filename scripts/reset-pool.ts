import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.roundPlayer.updateMany({
            data: {
                in_pool: false
            }
        });
        console.log(`Updated ${result.count} round players to in_pool: false`);
    } catch (err) {
        console.error('Error resetting in_pool:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
