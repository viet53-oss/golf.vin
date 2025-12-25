'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export async function uploadPhoto(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const date = formData.get('date') as string;
        const caption = formData.get('caption') as string;

        if (!file || !date) {
            return { success: false, error: 'Missing required fields' };
        }

        // 1. Save file to public/uploads
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });

        // Generate unique name
        const ext = path.extname(file.name);
        const fileName = `${randomUUID()}${ext}`;
        const filePath = path.join(uploadDir, fileName);

        await fs.writeFile(filePath, buffer);

        // 2. Save to DB
        // URL path relative to public
        const url = `/uploads/${fileName}`;

        await prisma.photo.create({
            data: {
                url,
                date,
                caption
            }
        });

        revalidatePath('/photos');
        return { success: true };

    } catch (error) {
        console.error('Upload error:', error);
        return { success: false, error: 'Failed to upload photo' };
    }
}

export async function deletePhoto(photoId: string) {
    try {
        // 1. Get photo to find file path
        const photo = await prisma.photo.findUnique({ where: { id: photoId } });
        if (!photo) return { success: false, error: 'Photo not found' };

        // 2. Delete from DB
        await prisma.photo.delete({ where: { id: photoId } });

        // 3. Delete file
        // photo.url is like "/uploads/xyz.jpg" -> convert to system path
        // Remove leading /
        const relativePath = photo.url.startsWith('/') ? photo.url.slice(1) : photo.url;
        const filePath = path.join(process.cwd(), 'public', relativePath);

        try {
            await fs.unlink(filePath);
        } catch (e) {
            console.warn('Failed to delete file from disk, but removed from DB', e);
        }

        revalidatePath('/photos');
        return { success: true };
    } catch (error) {
        console.error('Delete error:', error);
        return { success: false, error: 'Failed to delete photo' };
    }
}

export async function updatePhoto(id: string, date: string, caption: string) {
    try {
        await prisma.photo.update({
            where: { id },
            data: { date, caption }
        });
        revalidatePath('/photos');
        return { success: true };
    } catch (error) {
        console.error('Update photo error:', error);
        return { success: false, error: 'Failed to update photo' };
    }
}

export async function getPhotos(offset: number, limit: number) {
    try {
        const photos = await prisma.photo.findMany({
            orderBy: { date: 'desc' },
            take: limit,
            skip: offset,
        });
        return { success: true, photos };
    } catch (error) {
        console.error('Fetch photos error:', error);
        return { success: false, error: 'Failed to fetch photos' };
    }
}
