'use client';

import { useState, useEffect } from 'react';
import { PenTool, X, Save, Loader2 } from 'lucide-react';
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
        // Force reload to see changes in title?
        window.location.reload();
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex justify-center items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors"
            >
                <PenTool className="w-4 h-4" />
                Edit Meta Tags
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <PenTool className="w-5 h-5" /> Edit Site Metadata
                        </h2>

                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Site Title</label>
                                    <input
                                        type="text"
                                        value={config.title}
                                        onChange={e => setConfig({ ...config, title: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Appears in browser tab and search results.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                    <textarea
                                        rows={3}
                                        value={config.description}
                                        onChange={e => setConfig({ ...config, description: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Keywords</label>
                                    <input
                                        type="text"
                                        value={config.keywords}
                                        onChange={e => setConfig({ ...config, keywords: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-black"
                                        placeholder="golf, sports, scores..."
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-2">
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="px-4 py-2 text-gray-600 font-medium hover:text-black"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isLoading}
                                        className="px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 flex items-center gap-2"
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
