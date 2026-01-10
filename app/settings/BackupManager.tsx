'use client';

import { useState, useRef } from 'react';

const Download = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
    </svg>
);

const Upload = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
    </svg>
);

const AlertTriangle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
);

const CheckCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const Loader2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" />
    </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
);

import { getBackupData, restoreBackupData, backupPhotosToLocal } from '../actions/backup';

export default function BackupManager() {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownload = async () => {
        setLoadingAction('download');
        setStatus('idle');
        try {
            const result = await getBackupData();
            if (result.success && result.data) {
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
            setLoadingAction(null);
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

        setLoadingAction('restore');
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
            setLoadingAction(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePhotoBackup = async () => {
        setLoadingAction('photos');
        setStatus('idle');
        setMessage('Backing up photos to server storage...');
        try {
            const result = await backupPhotosToLocal();
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
            setLoadingAction(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <button
                    onClick={handleDownload}
                    disabled={!!loadingAction}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    {loadingAction === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download Backup
                </button>

                <button
                    onClick={handleRestoreClick}
                    disabled={!!loadingAction}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    {loadingAction === 'restore' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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
                <div className={`p-3 rounded-lg flex items-center gap-2 text-[14pt] font-medium ${status === 'success' ? 'bg-green-50 text-green-700' :
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
                disabled={!!loadingAction}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
                {loadingAction === 'photos' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                Backup All Photos to Local Directory
            </button>
        </div>
    );
}
