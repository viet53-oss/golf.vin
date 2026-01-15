
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error("DATABASE_URL is missing in environment variables. Please check your Vercel project settings.");
    } else {
        console.warn("DATABASE_URL is missing in environment.");
    }
}

const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 10 : 5, // Limit connections
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined // Enable SSL for Supabase in prod
});
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Force refresh: 1767905792000
