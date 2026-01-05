const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const courses = await prisma.course.findMany({
            include: {
                _count: {
                    select: { rounds: true, live_rounds: true }
                }
            }
        });
        console.log(JSON.stringify(courses, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
