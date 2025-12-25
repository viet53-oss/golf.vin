
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Load env vars if not already loaded (e.g. via --env-file)
if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not set. Please run with --env-file=.env");
    process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const photosDir = String.raw`C:\Users\viet4\Documents\Antigravity\golf-v3\photos`;

    if (!fs.existsSync(photosDir)) {
        console.log(`Directory not found: ${photosDir}`);
        // Create it for the user
        fs.mkdirSync(photosDir);
        console.log(`Created directory: ${photosDir}. Please put photos here and run again.`);
        return;
    }

    const files = fs.readdirSync(photosDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));

    console.log(`Found ${images.length} images.`);

    for (const image of images) {
        const filePath = path.join(photosDir, image);
        const stats = fs.statSync(filePath);

        // Move to public/photos so they are accessible
        const publicPhotosDir = path.join(process.cwd(), 'public', 'photos');
        if (!fs.existsSync(publicPhotosDir)) {
            fs.mkdirSync(publicPhotosDir, { recursive: true });
        }

        const publicPath = path.join(publicPhotosDir, image);

        // Copy if not exists
        if (!fs.existsSync(publicPath)) {
            fs.copyFileSync(filePath, publicPath);
        }

        const url = `/photos/${image}`;
        const date = stats.mtime.toISOString().split('T')[0]; // Use file modification time as date

        // Check if exists
        const existing = await prisma.photo.findFirst({
            where: { url }
        });

        if (!existing) {
            await prisma.photo.create({
                data: {
                    url,
                    date,
                    caption: image // Default caption to filename
                }
            });
            console.log(`Imported: ${image} as ${date}`);
        } else {
            console.log(`Skipped (already exists): ${image}`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
