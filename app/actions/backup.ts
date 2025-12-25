'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function getBackupData() {
    try {
        const [players, courses, rounds, roundPlayers, handicapRounds] = await Promise.all([
            prisma.player.findMany(),
            prisma.course.findMany({ include: { tee_boxes: true, holes: true } }),
            prisma.round.findMany(),
            prisma.roundPlayer.findMany(),
            prisma.handicapRound.findMany()
        ]);

        const backup = {
            version: 1,
            timestamp: new Date().toISOString(),
            data: {
                players,
                courses,
                rounds,
                roundPlayers,
                handicapRounds
            }
        };

        return { success: true, data: JSON.stringify(backup, null, 2) };
    } catch (error) {
        console.error('Backup failed:', error);
        return { success: false, error: 'Failed to generate backup' };
    }
}

export async function restoreBackupData(jsonString: string) {
    try {
        const backup = JSON.parse(jsonString);

        if (!backup.data) throw new Error('Invalid backup format');

        const { players, courses, rounds, roundPlayers, handicapRounds } = backup.data;

        // Transactional Restore: Wipe and Replace strategy for consistency
        // Note: In a real prod app, we might check for existing IDs or use upsert. 
        // For this local/small app, a full state restore is often desired.
        // However, wiping is scary. Let's try upsert for Players/Courses and maybe createMany for scores if missing.
        // ACTUALLY, "Restore" usually means "Go back to this state".
        // Let's implement a safe upset strategy where possible, but for Rounds/Scores, it's safer to delete conflicts?

        // Let's go with a cleaner Wipe-All-And-Replace inside a transaction to ensure integrity.
        // If it fails, nothing is lost.

        await prisma.$transaction(async (tx: TransactionClient) => {
            // 1. Clean existing data (Dependents first)
            await tx.roundPlayer.deleteMany();
            await tx.handicapRound.deleteMany();
            await tx.round.deleteMany();
            await tx.hole.deleteMany();
            await tx.teeBox.deleteMany();
            await tx.course.deleteMany();
            await tx.player.deleteMany();

            // 2. Restore Players
            if (players?.length) {
                await tx.player.createMany({ data: players });
            }

            // 3. Restore Courses (Deep insert often tricky with createMany, so we map)
            // Courses have relations (TeeBoxes, Holes). createMany doesn't support relations.
            console.log('Restoring Courses...');
            for (const course of courses) {
                // We must separate the relation data
                const { tee_boxes, holes, ...courseData } = course;
                await tx.course.create({
                    data: {
                        ...courseData,
                        tee_boxes: { create: tee_boxes },
                        holes: { create: holes }
                    }
                });
            }

            // 4. Restore Rounds
            if (rounds?.length) {
                await tx.round.createMany({ data: rounds });
            }

            // 5. Restore Round Players
            if (roundPlayers?.length) {
                await tx.roundPlayer.createMany({ data: roundPlayers });
            }

            // 6. Restore Manual Rounds
            if (handicapRounds?.length) {
                await tx.handicapRound.createMany({ data: handicapRounds });
            }
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Restore failed:', error);
        return { success: false, error: 'Failed to restore data. Check format.' };
    }
}

export async function backupPhotosToLocal() {
    try {
        const fs = require('fs');
        const path = require('path');
        // Node 18+ has native fetch, so we don't need to require it.
        // If on older node, we might need a polyfill, but assuming recent Next.js.

        const photos = await prisma.photo.findMany();
        if (!photos.length) return { success: false, error: 'No photos to backup' };

        // Targeted backup directory
        const backupDir = String.raw`C:\Users\viet4\Documents\Antigravity\golf-v3\photos`;

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        for (const photo of photos) {
            try {
                const fileName = path.basename(photo.url);
                const destPath = path.join(backupDir, fileName);

                // Skip if file already exists
                if (fs.existsSync(destPath)) {
                    skippedCount++;
                    continue;
                }

                // If remote URL (vercel blob)
                if (photo.url.startsWith('http')) {
                    const response = await fetch(photo.url);
                    if (!response.ok) throw new Error(`Failed to fetch ${photo.url}`);
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    fs.writeFileSync(destPath, buffer);
                }
                // If local file path (e.g. /uploads/...)
                else {
                    // Remove leading slash for local path resolution
                    const relativePath = photo.url.startsWith('/') ? photo.url.slice(1) : photo.url;
                    const sourcePath = path.join(process.cwd(), 'public', relativePath);

                    if (fs.existsSync(sourcePath)) {
                        fs.copyFileSync(sourcePath, destPath);
                    } else {
                        console.warn(`Local file not found: ${sourcePath}`);
                        failCount++;
                        continue;
                    }
                }
                successCount++;
            } catch (err) {
                console.error(`Failed to backup photo ${photo.id}:`, err);
                failCount++;
            }
        }

        return {
            success: true,
            message: `Backup complete. Downloaded: ${successCount}, Skipped: ${skippedCount}, Failed: ${failCount}`
        };

    } catch (error) {
        console.error('Photo backup failed:', error);
        return { success: false, error: 'Failed to execute photo backup' };
    }
}
