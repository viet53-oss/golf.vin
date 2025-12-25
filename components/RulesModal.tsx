'use client';

import { X } from 'lucide-react';

type RulesModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: React.ReactNode;
};

export default function RulesModal({ isOpen, onClose, title, content }: RulesModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-6xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                        {content}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-gray-900 text-white px-8 py-2 rounded-xl font-bold text-sm hover:bg-black transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
