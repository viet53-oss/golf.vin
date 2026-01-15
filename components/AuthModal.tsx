'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { login, signup } from '@/app/actions/auth'
import { Dna, Phone, Lock, User, X, Mail, Calendar, Trophy } from 'lucide-react'

type AuthMode = 'signin' | 'signup'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
}

function SubmitButton({ mode }: { mode: AuthMode }) {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-black text-white font-bold text-lg py-3 rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50 mt-6 uppercase tracking-wider"
        >
            {pending ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>
    )
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>('signin')
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    async function handleSubmit(formData: FormData) {
        setError(null)
        const action = mode === 'signin' ? login : signup

        // We can't use useFormState easily inside a conditional or loop depending on React version, 
        // but here we are just calling the action directly.
        // However, since we defined action with (prevState, formData), we should match that signature or wrap it.
        // The action signature in auth.ts is: (prevState: any, formData: FormData) => Promise<{ error?: string, success?: boolean }>

        try {
            const result = await action(null, formData)
            if (result?.error) {
                setError(result.error)
            } else if (result?.success) {
                onClose()
                window.location.reload() // Refresh to update session state
            }
        } catch (e) {
            setError('An unexpected error occurred')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    aria-label="Close modal"
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="p-8 flex flex-col items-center">

                    <h1 className="text-3xl font-bold text-black mb-2">
                        {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                    </h1>

                    {mode === 'signin' && (
                        <p className="text-red-500 font-semibold mb-6 text-center">
                            For testing just select: <br /> Sign in
                        </p>
                    )}

                    {/* Dna Icon Placeholder - Golden/Yellowish */}
                    <div className="mb-8 text-[#d4af37]">
                        <Dna size={64} strokeWidth={2.5} />
                    </div>

                    <div className="w-full text-left mb-6">
                        <h3 className="text-xl font-bold text-gray-900">
                            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                        </h3>
                        <p className="text-gray-500">
                            {mode === 'signin' ? 'Sign in to your health dashboard' : 'Join Chu Precision Health Center'}
                        </p>
                    </div>

                    <form action={handleSubmit} className="w-full space-y-4">
                        {mode === 'signup' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-600 block">First Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input
                                                name="firstName"
                                                type="text"
                                                placeholder="John"
                                                className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-600 block">Last Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input
                                                name="lastName"
                                                type="text"
                                                placeholder="Doe"
                                                className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600 block">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            name="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-600 block">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    name="phone"
                                    type="tel"
                                    placeholder="(555) 555-5555"
                                    className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-600 block">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {mode === 'signup' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label htmlFor="birthday" className="text-sm font-medium text-gray-600 block">Birthday</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input
                                                id="birthday"
                                                name="birthday"
                                                type="date"
                                                className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="dateStarted" className="text-sm font-medium text-gray-600 block">Date Started</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input
                                                id="dateStarted"
                                                name="dateStarted"
                                                type="date"
                                                className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="preferredTeeBox" className="text-sm font-medium text-gray-600 block">Preferred Tee Box</label>
                                    <div className="relative">
                                        <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <select
                                            id="preferredTeeBox"
                                            name="preferredTeeBox"
                                            className="w-full pl-10 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all appearance-none"
                                        >
                                            <option value="">Select a tee box</option>
                                            <option value="Black">Black</option>
                                            <option value="Blue">Blue</option>
                                            <option value="White">White</option>
                                            <option value="Gold">Gold</option>
                                            <option value="Green">Green</option>
                                            <option value="Red">Red</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <SubmitButton mode={mode} />
                    </form>

                    {mode === 'signin' && (
                        <button className="mt-4 text-[#1a4d2e] font-bold text-lg hover:underline">
                            FORGOT PASSWORD?
                        </button>
                    )}

                    <div className="mt-6 text-gray-500">
                        {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setMode(mode === 'signin' ? 'signup' : 'signin')
                                setError(null)
                            }}
                            className="text-[#1a4d2e] font-bold hover:underline"
                        >
                            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}
