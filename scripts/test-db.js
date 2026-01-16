
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testConnection() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    });

    console.log('Testing connection to:', process.env.DATABASE_URL.split('@')[1]); // Log host only for safety

    try {
        await prisma.$connect();
        console.log('Successfully connected to the database!');
        const playerCount = await prisma.player.count();
        console.log('Player count:', playerCount);
    } catch (error) {
        console.error('Connection failed:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
