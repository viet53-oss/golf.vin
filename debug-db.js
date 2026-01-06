const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const course = await prisma.course.findFirst({
            where: { name: { contains: 'City Park North', mode: 'insensitive' } },
            include: { tee_boxes: true }
        });
        if (course) {
            console.log('COURSE_FOUND:' + course.name);
            console.log('TEES:' + JSON.stringify(course.tee_boxes));
        } else {
            console.log('COURSE_NOT_FOUND');
        }

        const samplePlayers = await prisma.player.findMany({
            take: 5,
            select: { name: true, preferred_tee_box: true }
        });
        console.log('PLAYERS:' + JSON.stringify(samplePlayers));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
