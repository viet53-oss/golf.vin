'use client';

import { useState } from 'react';

export default function GPSPermissionButton() {
    const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const requestPermission = () => {
        if (!navigator.geolocation) {
            setStatus('error');
            setMessage('Geolocation is not supported by your browser.');
            return;
        }

        setStatus('requesting');
        setMessage('Requesting location access...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setStatus('granted');
                setMessage('Success! Location access granted.');
                // We don't need the position here, just confirming access works
            },
            (error) => {
                setStatus('denied');
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setMessage('Permission denied. Please enable location in your browser settings.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setMessage('Location information is unavailable.');
                        break;
                    case error.TIMEOUT:
                        setMessage('The request to get user location timed out.');
                        break;
                    default:
                        setMessage('An unknown error occurred.');
                        break;
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <div className="space-y-3">
            <button
                onClick={requestPermission}
                disabled={status === 'requesting'}
                className={`w-full py-2 px-4 rounded-full font-bold text-[15pt] transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${status === 'granted'
                        ? 'bg-green-600 text-white'
                        : status === 'denied' || status === 'error'
                            ? 'bg-red-600 text-white'
                            : 'bg-black text-white hover:bg-gray-800'
                    }`}
            >
                {status === 'idle' && '📍 Allow GPS Access'}
                {status === 'requesting' && '🛰️ Requesting...'}
                {status === 'granted' && '✅ GPS Access Active'}
                {status === 'denied' && '❌ Access Denied'}
                {status === 'error' && '❓ GPS Error'}
            </button>
            {message && (
                <p className={`text-[12pt] text-center font-medium ${status === 'granted' ? 'text-green-700' : 'text-red-700'
                    }`}>
                    {message}
                </p>
            )}
            <p className="text-[10pt] text-gray-500 italic text-center">
                Note: GPS is required for the "Distance to Pin" feature on the Live page.
            </p>
        </div>
    );
}
