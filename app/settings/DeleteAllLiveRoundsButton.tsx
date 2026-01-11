'use client';

import { useState } from 'react';
import { deleteAllLiveRounds } from '@/app/actions/delete-all-live-rounds';

export default function DeleteAllLiveRoundsButton() {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        const password = prompt("Enter password to delete ALL live rounds:");
        if (password !== 'cpgc-Delete') {
            if (password) alert('Incorrect password.');
            return;
        }

        if (!confirm('Are you sure you want to delete ALL live rounds? This cannot be undone.')) {
            return;
        }

        setIsDeleting(true);
        try {
            const result = await deleteAllLiveRounds();
            if (result.success) {
                alert('All live rounds deleted successfully!');
                window.location.href = '/live';
            } else {
                alert('Failed to delete: ' + result.error);
            }
        } catch (error) {
            alert('Error: ' + error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 transition-colors text-[15pt]"
        >
            {isDeleting ? 'Deleting...' : 'Delete All Live Rounds'}
        </button>
    );
}
