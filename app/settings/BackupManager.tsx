'use client';

import { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { getBackupData, restoreBackupData } from '../actions/backup';

export default function BackupManager() {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownload = async () => {
        setIsLoading(true);
        setStatus('idle');
        try {
            const result = await getBackupData();
            if (result.success && result.data) {
                // Create blob and download
                const blob = new Blob([result.data], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `golf-app-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setStatus('success');
                setMessage('Backup downloaded successfully');
            } else {
                setStatus('error');
                setMessage(result.error || 'Download failed');
            }
        } catch (e) {
            setStatus('error');
            setMessage('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestoreClick = () => {
        if (confirm("WARNING: Restore will DELETE all current data and replace it with the backup. Are you sure?")) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setStatus('idle');
        setMessage('Restoring data...');

        try {
            const text = await file.text();
            const result = await restoreBackupData(text);
            if (result.success) {
                setStatus('success');
                setMessage('Data restored successfully! Refreshing...');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setStatus('error');
                setMessage(result.error || 'Restore failed');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Failed to read backup file');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePhotoBackup = async () => {
        setIsLoading(true);
        setStatus('idle');
        setMessage('Backing up photos to server storage...');
        try {
            const result = await backupPhotosToLocal(); // This runs on server
            if (result.success) {
                setStatus('success');
                setMessage(result.message || 'Photos backed up successfully to local directory');
            } else {
                setStatus('error');
                setMessage(result.error || 'Backup failed');
            }
        } catch (e) {
            setStatus('error');
            setMessage('An unexpected error occurred during photo backup');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <button
                    onClick={handleDownload}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-black text-white px-4 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download Backup
                </button>

                <button
                    onClick={handleRestoreClick}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Restore from Backup
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                />
            </div>

            {message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${status === 'success' ? 'bg-green-50 text-green-700' :
                    status === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                    {status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                        status === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                            <Loader2 className="w-4 h-4 animate-spin" />}
                    {message}
                </div>
            )}

            <hr className="border-gray-200" />

            <button
                onClick={handlePhotoBackup}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 border border-gray-300 text-gray-800 px-4 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
                {isLoading && message.includes('photos') ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                Backup All Photos to Local Directory
            </button>
        </div>
    );
}

import { ImageIcon } from 'lucide-react';
import { backupPhotosToLocal } from '../actions/backup';
