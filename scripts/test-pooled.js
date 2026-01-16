
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testConnection() {
    const pooledUrl = process.env.DATABASE_URL.replace(':5432/', ':6543/') + '?pgbouncer=true';
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: pooledUrl
            }
        }
    });

    console.log('Testing POOLED connection to:', pooledUrl.split('@')[1]);

    try {
        await prisma.$connect();
        console.log('Successfully connected via POOLER!');
        const playerCount = await prisma.player.count();
        console.log('Player count:', playerCount);
    } catch (error) {
        console.error('Pooled connection failed:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
