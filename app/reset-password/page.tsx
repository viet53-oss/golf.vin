'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword } from '@/app/actions/auth'
import { Lock, CheckCircle, ChevronRight, XCircle } from 'lucide-react'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        if (!token) {
            setErrorMessage('Invalid reset link')
            setStatus('error')
            return
        }

        setStatus('loading')
        setErrorMessage(null)

        const result = await resetPassword(token, formData)

        if (result.success) {
            setStatus('success')
            // Delay redirect to let user see success message
            setTimeout(() => {
                router.push('/')
            }, 3000)
        } else {
            setStatus('error')
            setErrorMessage(result.error || 'Failed to reset password')
        }
    }

    const [manualToken, setManualToken] = useState('')

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualToken.trim()) {
            router.push(`/reset-password?token=${manualToken.trim()}`)
        }
    }

    if (!token) {
        return (
            <div className="min-h-screen bg-[#2e7d32] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl text-center">
                    <div className="text-[#1a4d2e] flex items-center justify-center gap-2 mb-6">
                        <span role="img" aria-label="golf" className="text-3xl">⛳</span>
                        <span className="font-bold tracking-tight text-2xl">Golf Live Scores</span>
                    </div>

                    <h1 className="text-2xl font-black text-gray-900 mb-2">Enter Reset Code</h1>
                    <p className="text-gray-500 font-medium mb-6 text-sm">
                        If the link didn't work, copy the code from the end of the URL you received (e.g. the long string of letters and numbers) and paste it here.
                    </p>

                    <form onSubmit={handleManualSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            placeholder="Enter reset code"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium text-center"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full bg-[#1a4d2e] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#143d24] transition-all"
                        >
                            Verify Code
                        </button>
                    </form>

                    <button onClick={() => router.push('/')} className="mt-6 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors">
                        Back to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#2e7d32] flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative border border-white/20">

                <div className="text-[#1a4d2e] flex items-center justify-center gap-2 mb-8">
                    <span role="img" aria-label="golf" className="text-3xl">⛳</span>
                    <span className="font-bold tracking-tight text-2xl">Golf Live Scores</span>
                </div>

                {status === 'success' ? (
                    <div className="text-center animate-in zoom-in duration-300">
                        <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                        <h1 className="text-2xl font-black text-gray-900 mb-2">Password Reset!</h1>
                        <p className="text-gray-500 font-medium mb-6">Your password has been successfully updated. Redirecting you to login...</p>
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-black text-center text-gray-900 mb-2">Create New Password</h1>
                        <p className="text-center text-gray-500 font-medium mb-8 text-sm">Please enter your new password below.</p>

                        <form action={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all font-medium"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            {errorMessage && (
                                <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-bold text-center border border-red-100 animate-in shake duration-300">
                                    {errorMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full bg-[#1a4d2e] text-white font-bold text-xl py-4 rounded-2xl hover:bg-[#143d24] transition-all transform active:scale-[0.98] disabled:opacity-50 mt-4 uppercase tracking-wider shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                            >
                                {status === 'loading' ? 'Resetting...' : (
                                    <>
                                        Reset Password
                                        <ChevronRight size={24} />
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#2e7d32] flex items-center justify-center text-white font-bold text-xl">Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    )
}
