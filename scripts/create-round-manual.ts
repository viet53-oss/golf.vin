import { prisma } from '../lib/prisma';

async function main() {
    const todayStr = '2026-01-05'
    const course = await prisma.course.findFirst({
        where: { name: { contains: 'City Park' } }
    })

    if (!course) {
        console.log('Course not found')
        return
    }

    try {
        const round = await prisma.liveRound.create({
            data: {
                name: `Live Round - ${todayStr}`,
                date: todayStr,
                course_id: course.id,
                par: 68,
                rating: 63.8,
                slope: 100
            } as any
        })
        console.log('Successfully created round:', round.id)
    } catch (e: any) {
        console.error('FAILED TO CREATE:', e.message)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
