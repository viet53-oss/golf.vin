'use client';

export default function RefreshButton() {
    return (
        <button
            onClick={() => window.location.reload()}
            className="px-1 py-2 bg-black text-white rounded-full text-[14pt] font-bold hover:bg-gray-800 transition-colors cursor-pointer"
        >
            Refresh
        </button>
    );
}
