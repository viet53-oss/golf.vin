import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const todayStr = '2026-01-05'
    const course = await prisma.course.findFirst({
        where: { name: { contains: 'City Park' } }
    })

    if (!course) {
        console.log('Course not found')
        return
    }

    const round = await prisma.liveRound.create({
        data: {
            name: `Live Round - ${todayStr}`,
            date: todayStr,
            course_id: course.id,
            par: 68,
            rating: 63.8,
            slope: 100
        }
    })
    console.log('Created round:', round)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
