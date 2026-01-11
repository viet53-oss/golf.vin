'use client';

import { useState, useEffect } from 'react';

export default function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);

    useEffect(() => {
        // Detect iOS (including iPadOS 13+ which reports as Mac)
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        setIsIOS(isIOSDevice);

        // Detect Android
        const isAndroidDevice = /android/.test(userAgent);
        setIsAndroid(isAndroidDevice);

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
        // If iOS, show instructions modal
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        // If Android and no prompt available, show instructions
        if (isAndroid && !deferredPrompt) {
            setShowAndroidInstructions(true);
            return;
        }

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
        <>
            <button
                onClick={handleInstallClick}
                disabled={!isInstallable && !isIOS && !isAndroid}
                className={`w-full px-4 py-2 rounded-full text-[15pt] font-bold transition-all ${isInstallable || isIOS || isAndroid
                    ? 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
            >
                {isIOS
                    ? '🍎 Install App on iPhone/iPad'
                    : isAndroid
                        ? (isInstallable ? '🤖 Install App on Android' : '🤖 Install App on Android')
                        : isInstallable
                            ? '📱 Install App on Your Device'
                            : '✓ App Already Installed or Not Available'}
            </button>

            {/* iOS Installation Instructions Modal */}
            {showIOSInstructions && (
                <div
                    className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 animate-in fade-in duration-300"
                    onClick={() => setShowIOSInstructions(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-6 mx-4 max-w-md shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-[20pt] font-black text-gray-900 mb-4 text-center">
                            🍎 Install on iPhone/iPad
                        </h2>

                        <div className="space-y-4 text-[14pt] text-gray-700">
                            <div className="flex gap-3">
                                <span className="font-black text-green-600 text-[16pt]">1.</span>
                                <p>Tap the <strong>Share button</strong> <span className="text-blue-600 text-[18pt]">⎙</span> at the bottom of Safari</p>
                            </div>

                            <div className="flex gap-3">
                                <span className="font-black text-green-600 text-[16pt]">2.</span>
                                <p>Scroll down and tap <strong>"Add to Home Screen"</strong> <span className="text-[18pt]">➕</span></p>
                            </div>

                            <div className="flex gap-3">
                                <span className="font-black text-green-600 text-[16pt]">3.</span>
                                <p>Tap <strong>"Add"</strong> in the top right corner</p>
                            </div>

                            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mt-4">
                                <p className="text-[13pt] text-blue-900">
                                    <strong>Note:</strong> This only works in Safari browser, not Chrome or other browsers on iOS.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowIOSInstructions(false)}
                            className="w-full mt-6 bg-black text-white rounded-full px-4 py-2 text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                        >
                            Got It!
                        </button>
                    </div>
                </div>
            )}

            {/* Android Installation Instructions Modal */}
            {showAndroidInstructions && (
                <div
                    className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 animate-in fade-in duration-300"
                    onClick={() => setShowAndroidInstructions(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-6 mx-4 max-w-md shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-[20pt] font-black text-gray-900 mb-4 text-center">
                            🤖 Install on Android
                        </h2>

                        <div className="space-y-4 text-[14pt] text-gray-700">
                            <div className="flex gap-3">
                                <span className="font-black text-green-600 text-[16pt]">1.</span>
                                <p>Tap the <strong>Menu button</strong> <span className="text-[18pt]">⋮</span> (three dots) in Chrome</p>
                            </div>

                            <div className="flex gap-3">
                                <span className="font-black text-green-600 text-[16pt]">2.</span>
                                <p>Look for <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong> <span className="text-[18pt]">📱</span></p>
                            </div>

                            <div className="flex gap-3">
                                <span className="font-black text-green-600 text-[16pt]">3.</span>
                                <p>Tap <strong>"Install"</strong> to add the app to your home screen</p>
                            </div>

                            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 mt-4">
                                <p className="text-[13pt] text-orange-900">
                                    <strong>Note:</strong> If you don't see the install option, make sure you're using Chrome browser and the page has fully loaded. Try refreshing the page.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowAndroidInstructions(false)}
                            className="w-full mt-6 bg-black text-white rounded-full px-4 py-2 text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                        >
                            Got It!
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
