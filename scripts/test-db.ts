
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
})

async function main() {
    try {
        console.log('Connecting to database...')
        const count = await prisma.player.count()
        console.log(`Successfully connected! Found ${count} players in the database.`)

        if (count > 0) {
            const firstPlayer = await prisma.player.findFirst()
            console.log('Sample player:', firstPlayer.name)
        }
    } catch (e) {
        console.error('Connection failed:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
