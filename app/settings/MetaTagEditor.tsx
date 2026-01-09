'use client';

import { useState, useEffect } from 'react';

const PenTool = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 19 7-7 3 3-7 7-3-3z" /><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="m2 2 5 5" /><path d="m8.5 8.5 1 1" />
    </svg>
);

const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
);

const Save = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
);

const Loader2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" />
    </svg>
);

import { fetchSiteConfig, saveSiteConfig } from '../actions/site-config';

type Config = { title: string; description: string; keywords: string };

export default function MetaTagEditor() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useState<Config>({ title: '', description: '', keywords: '' });

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            fetchSiteConfig().then((data) => {
                setConfig({
                    title: data.title,
                    description: data.description,
                    keywords: data.keywords || ''
                });
                setIsLoading(false);
            });
        }
    }, [isOpen]);

    const handleSave = async () => {
        setIsLoading(true);
        await saveSiteConfig(config);
        setIsLoading(false);
        setIsOpen(false);
        window.location.reload();
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex justify-center items-center gap-2 px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors"
            >
                <PenTool className="w-4 h-4" />
                Edit Meta Tags
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-colors shadow-md active:scale-95"
                        >
                            Close
                        </button>

                        <h2 className="text-[14pt] font-bold mb-6 flex items-center gap-2">
                            <PenTool className="w-5 h-5" /> Edit Site Metadata
                        </h2>

                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[14pt] font-bold text-gray-700 mb-1">Site Title</label>
                                    <input
                                        type="text"
                                        value={config.title}
                                        onChange={e => setConfig({ ...config, title: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black text-[14pt]"
                                    />
                                    <p className="text-[14pt] text-gray-500 mt-1">Appears in browser tab and search results.</p>
                                </div>

                                <div>
                                    <label className="block text-[14pt] font-bold text-gray-700 mb-1">Description</label>
                                    <textarea
                                        rows={3}
                                        value={config.description}
                                        onChange={e => setConfig({ ...config, description: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black text-[14pt]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[14pt] font-bold text-gray-700 mb-1">Keywords</label>
                                    <input
                                        type="text"
                                        value={config.keywords}
                                        onChange={e => setConfig({ ...config, keywords: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black text-[14pt]"
                                        placeholder="golf, sports, scores..."
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="px-1 py-2 text-gray-600 font-medium hover:text-black text-[14pt]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isLoading}
                                        className="px-1 py-2 bg-black text-white rounded-full font-bold hover:bg-gray-800 flex items-center gap-2 text-[14pt] active:scale-95"
                                    >
                                        <Save className="w-4 h-4" /> Save
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
