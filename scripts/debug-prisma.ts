
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

async function testInit(name: string, options: any) {
    try {
        console.log(`Testing ${name}...`)
        const prisma = new PrismaClient(options)
        await prisma.$connect()
        console.log(`✅ ${name} success!`)
        await prisma.$disconnect()
        return true
    } catch (e: any) {
        console.log(`❌ ${name} failed: ${e.message.split('\n')[0]}`)
        return false
    }
}

async function main() {
    console.log('Debugging Prisma Client Init...')

    // Test 1: Empty
    await testInit('Empty', {})

    // Test 2: datasources (Legacy)
    await testInit('Datasources', {
        datasources: { db: { url: process.env.DATABASE_URL } }
    })

    // Test 3: Standard URL override? (Guessing for Prisma 7)
    // Sometimes it's passed differently or maybe just needs explicit log to be "non-empty"
    await testInit('Log Option', {
        log: ['info']
    })
}

main()
