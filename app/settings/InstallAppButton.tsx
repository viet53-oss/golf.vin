'use client';

import { useState, useEffect } from 'react';

export default function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert('App is already installed or installation is not available on this device.');
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // Clear the deferredPrompt
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    return (
        <button
            onClick={handleInstallClick}
            disabled={!isInstallable}
            className={`w-full px-4 py-3 rounded-full text-[14pt] font-bold transition-all ${isInstallable
                    ? 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
        >
            {isInstallable ? '📱 Install App on Your Device' : '✓ App Already Installed or Not Available'}
        </button>
    );
}
