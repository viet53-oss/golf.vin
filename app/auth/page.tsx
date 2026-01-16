'use client'

import { useState } from 'react'
import { login, signup, signInWithGitHub } from './actions'
import { LogIn, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function AuthPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccessMessage(null)

        const formData = new FormData(e.currentTarget)
        try {
            let result: { success: boolean, error?: string, message?: string } | undefined;
            if (mode === 'login') {
                result = await login(formData) as any
            } else {
                result = await signup(formData) as any
            }

            if (result && !result.success) {
                setError(result.error || 'An error occurred during authentication')
                setLoading(false)
            } else if (result?.success && result.message) {
                setSuccessMessage(result.message)
                setLoading(false)
            }
        } catch (err: any) {
            // Next.js redirect creates an error that should not be caught
            if (err.digest?.startsWith('NEXT_REDIRECT')) throw err;

            setError(err.message || 'An unexpected error occurred')
            setLoading(false)
        }
    }

    const handleGitHubLogin = async () => {
        setLoading(true)
        setError(null)
        try {
            await signInWithGitHub()
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'var(--background)'
        }}>
            <div className="glass auth-card animate-float">
                <div style={{ textAlign: 'center' }}>
                    <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>
                        {mode === 'login'
                            ? 'Enter your credentials to access your account'
                            : 'Join Golf.vin and experience digital excellence'}
                    </p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => setMode('login')}
                        type="button"
                    >
                        Login
                    </button>
                    <button
                        className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                        onClick={() => setMode('signup')}
                        type="button"
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {mode === 'signup' && (
                        <div className="input-group">
                            <label htmlFor="name">Full Name</label>
                            <input type="text" id="name" name="name" placeholder="John Doe" required />
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="email">Email Address</label>
                        <input type="email" id="email" name="email" placeholder="name@example.com" required />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                placeholder="••••••••"
                                required
                                style={{ width: '100%' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    opacity: 0.5,
                                    cursor: 'pointer'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            color: '#ff4d4d',
                            fontSize: '0.85rem',
                            background: 'rgba(255, 77, 77, 0.1)',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 77, 77, 0.2)'
                        }}>
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div style={{
                            color: '#4ade80',
                            fontSize: '0.85rem',
                            background: 'rgba(74, 222, 128, 0.1)',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(74, 222, 128, 0.2)'
                        }}>
                            {successMessage}
                        </div>
                    )}

                    <button className="glow-btn" disabled={loading} style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        opacity: loading ? 0.7 : 1
                    }}>
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : mode === 'login' ? (
                            <>
                                <LogIn size={20} /> Sign In
                            </>
                        ) : (
                            <>
                                <UserPlus size={20} /> Create Account
                            </>
                        )}
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.3 }}>
                    <div style={{ flex: 1, height: '1px', background: 'white' }} />
                    <span style={{ fontSize: '0.8rem' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'white' }} />
                </div>

                <button
                    onClick={handleGitHubLogin}
                    disabled={loading}
                    className="glass"
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.8rem',
                        padding: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.412-4.041-1.412-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    Continue with GitHub
                </button>

                <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </div>
            </div>
        </main>
    )
}
