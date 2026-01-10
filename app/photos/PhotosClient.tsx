'use client';

import { useState, useRef, useTransition } from 'react';
import { Upload, X, Trash2, Calendar, ImageIcon, Loader2, Edit2 } from 'lucide-react';
import { uploadPhoto, deletePhoto, getPhotos } from '../actions/photos';
import Image from 'next/image';
import { getTodayLocal, formatLocalDate } from '@/lib/date-utils';
import ConfirmModal from '@/components/ConfirmModal';

type Photo = {
    id: string;
    url: string;
    date: string;
    caption: string | null;
};


const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimensions (1920px is good balance for web)
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1920;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                }, 'image/jpeg', 0.8); // 80% quality
            };
            img.onerror = reject;
        };
        reader.readAsDataURL(file);
    });
};

export default function PhotosClient({ initialPhotos, isAdmin }: { initialPhotos: Photo[], isAdmin: boolean }) {
    const [isPending, startTransition] = useTransition();
    const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
    const [offset, setOffset] = useState(15);
    const [hasMore, setHasMore] = useState(true);

    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    } | null>(null);

    const [dragActive, setDragActive] = useState(false);
    const [date, setDate] = useState(getTodayLocal());
    const [caption, setCaption] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const formRef = useRef<HTMLFormElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

    const handleUpload = async (fileInput: File) => {
        let file = fileInput;

        // Validation & Compression
        // Vercel Server Actions limit is ~4.5MB
        const MAX_SIZE = 4.5 * 1024 * 1024;

        if (file.size > MAX_SIZE) {
            if (file.type.startsWith('video/')) {
                alert("Video file is too large. Max limit is 4.5MB per upload.");
                return;
            }

            // Attempt compression for images
            if (file.type.startsWith('image/')) {
                try {
                    file = await compressImage(file);
                    // Double check size after compression
                    if (file.size > MAX_SIZE) {
                        alert("Image is too large even after compression.");
                        return;
                    }
                } catch (e) {
                    console.error("Compression failed", e);
                    alert("Failed to process image.");
                    return;
                }
            } else {
                alert("File is too large (Max 4.5MB).");
                return;
            }
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('date', date);
        formData.append('caption', caption);

        startTransition(async () => {
            try {
                const res = await uploadPhoto(formData);
                if (res.success) {
                    setCaption('');
                    window.location.reload();
                } else {
                    alert('Upload failed: ' + res.error);
                }
            } catch (e) {
                console.error(e);
                alert('Upload failed. File might be too large or network error.');
            }
        });
    };

    const handleDelete = (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Delete Photo',
            message: 'Are you sure you want to delete this photo?',
            isDestructive: true,
            onConfirm: () => {
                setConfirmConfig(null);
                console.log('Deleting photo:', id);

                startTransition(async () => {
                    try {
                        const res = await deletePhoto(id);
                        console.log('Delete response:', res);
                        if (res.success) {
                            setPhotos(current => current.filter(p => p.id !== id));
                        } else {
                            alert('Failed to delete photo: ' + res.error);
                        }
                    } catch (error) {
                        console.error('Delete error client-side:', error);
                        alert('An error occurred while deleting the photo.');
                    }
                });
            }
        });
    };

    const handleEditClick = (photo: Photo) => {
        setEditingPhoto(photo);
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPhoto) return;

        startTransition(async () => {
            // We need a server action for update
            const { updatePhoto } = await import('../actions/photos');
            await updatePhoto(editingPhoto.id, editingPhoto.date, editingPhoto.caption || '');
            setEditingPhoto(null);

            // Optimistic update (no re-sort)
            setPhotos(current => current.map(p => p.id === editingPhoto.id ? editingPhoto : p));
        });
    };

    const loadMore = async () => {
        setIsLoadingMore(true);
        const res = await getPhotos(offset, 15);
        if (res.success && res.photos) {
            if (res.photos.length < 15) {
                setHasMore(false);
            }
            setPhotos(prev => [...prev, ...res.photos]);
            setOffset(prev => prev + 15);
        } else {
            setHasMore(false);
        }
        setIsLoadingMore(false);
    };

    const sortedPhotos = [...photos].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return (
        <div className="space-y-8">
            {/* Upload Form - Visible to Everyone */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                <h2 className="flex items-center gap-2 font-bold text-[14pt] mb-4">
                    <Upload className="w-5 h-5" /> Upload Photo/Video
                </h2>

                <form
                    className="space-y-4"
                    ref={formRef}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div
                        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors
                                ${dragActive ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'}`}
                    >
                        <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="font-bold text-gray-700">Drag and drop media here</p>
                        <p className="text-[14pt] text-gray-500 mb-4">or click to browse</p>
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={handleChange}
                            disabled={isPending}
                        />
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer bg-white border border-gray-300 px-1 py-2 rounded-lg font-bold text-[14pt] hover:bg-gray-50"
                        >
                            Browse Files
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[14pt] font-bold text-gray-700 mb-1">Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black pl-10"
                                />
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[14pt] font-bold text-gray-700 mb-1">Caption (Optional)</label>
                            <input
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Add a caption..."
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black"
                            />
                        </div>
                    </div>

                    {isPending && (
                        <div className="flex justify-center text-gray-500 text-[14pt] animate-pulse">
                            Uploading...
                        </div>
                    )}
                </form>
            </div>

            {/* Gallery */}
            <div className="space-y-4">
                <div className="flex justify-end">
                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="flex items-center gap-2 text-[14pt] font-bold text-gray-600 hover:text-black transition-colors bg-white px-1 py-1.5 rounded-lg border border-gray-200 shadow-sm"
                    >
                        <Calendar className="w-4 h-4" />
                        Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {sortedPhotos.map(photo => {
                        const isVideo = ['.mp4', '.mov', '.webm', '.ogg'].some(ext => photo.url.toLowerCase().endsWith(ext));

                        return (
                            <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="relative aspect-[4/3] bg-gray-100 flex items-center justify-center">
                                    {isVideo ? (
                                        <video
                                            src={photo.url}
                                            controls
                                            className="w-full h-full object-cover"
                                            playsInline
                                        />
                                    ) : (
                                        <Image
                                            src={photo.url}
                                            alt={photo.caption || 'Club Photo'}
                                            fill
                                            className="object-cover"
                                        />
                                    )}
                                </div>
                                <div className="p-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <p className="text-gray-900 font-medium line-clamp-2">
                                                {photo.caption}
                                            </p>
                                            <p className="text-[14pt] text-gray-500 mt-1">
                                                {formatLocalDate(photo.date)}
                                            </p>
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                onClick={() => handleEditClick(photo)}
                                                disabled={isPending}
                                                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-[14pt] transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(photo.id)}
                                                disabled={isPending}
                                                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold text-[14pt] transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {photos.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-[14pt] font-bold text-gray-900 mb-2">No Photos Yet</h3>
                        <p>Upload photos to start your gallery.</p>
                    </div>
                )}

                {photos.length > 0 && hasMore && (
                    <div className="flex justify-center pt-8">
                        <button
                            onClick={loadMore}
                            disabled={isLoadingMore}
                            className="bg-black text-white px-1 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            {isLoadingMore ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                                </>
                            ) : (
                                'Load More Photos'
                            )}
                        </button>
                    </div>
                )}
            </div>
            {/* Edit Modal */}
            {editingPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80">
                    <div className="bg-white rounded-xl shadow-2xl w-full p-3" onClick={e => e.stopPropagation()}>
                        <h3 className="text-[14pt] font-bold mb-4">Edit Photo</h3>
                        <form onSubmit={handleEditSave} className="space-y-4">
                            <div>
                                <label className="block text-[14pt] font-bold text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={editingPhoto.date}
                                    onChange={(e) => setEditingPhoto({ ...editingPhoto, date: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="block text-[14pt] font-bold text-gray-700 mb-1">Caption</label>
                                <textarea
                                    value={editingPhoto.caption || ''}
                                    onChange={(e) => setEditingPhoto({ ...editingPhoto, caption: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black min-h-[100px]"
                                    placeholder="Enter a caption..."
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingPhoto(null)}
                                    className="px-1 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-1 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50"
                                >
                                    {isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmConfig && (
                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    isDestructive={confirmConfig.isDestructive}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(null)}
                />
            )}
        </div>
    );
}


