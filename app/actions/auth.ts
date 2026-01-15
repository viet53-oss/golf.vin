'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
    if (!process.env.DATABASE_URL) {
        return { error: 'System Config Error: DATABASE_URL is missing in Vercel environment variables.' };
    }
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required', email }
    }

    try {
        const player = await prisma.player.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            }
        })

        if (!player || !player.password) {
            return { error: 'Invalid credentials', email }
        }

        const isValid = await bcrypt.compare(password, player.password)

        if (!isValid) {
            return { error: 'Invalid credentials', email }
        }

        // Set session
        const cookieStore = await cookies()
        cookieStore.set('session_userId', player.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/'
        })
        cookieStore.set('auth_status', 'true', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })

        return { success: true }
    } catch (error) {
        console.error('Login error:', error)
        return { error: 'Login Error: ' + (error instanceof Error ? error.message : String(error)), email }
    }
}

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function forgotPassword(prevState: any, formData: FormData) {
    const email = formData.get('email') as string

    if (!email) {
        return { error: 'Email is required' }
    }

    try {
        const player = await prisma.player.findFirst({
            where: { email: email.trim() }
        })

        if (player) {
            // Generate token
            const token = crypto.randomUUID();
            const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

            await prisma.player.update({
                where: { id: player.id },
                data: {
                    resetToken: token,
                    resetTokenExpiry: expires
                }
            });

            // In production, use actual domain. Locally, use localhost.
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const resetLink = `${baseUrl}/reset-password?token=${token}`;

            console.log('-------------------------------------------');
            console.log('Generated reset link:', resetLink);
            console.log('-------------------------------------------');

            await resend.emails.send({
                from: 'onboarding@resend.dev', // Can only send to own email on free tier without domain verification
                to: email,
                subject: 'Reset Your Golf Live Scores Password',
                html: `
                    <p>Hello ${player.name},</p>
                    <p>You requested a password reset. Click the link below to set a new password:</p>
                    <p><a href="${resetLink}">Reset Password</a></p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this, you can ignore this email.</p>
                `
            });
        }

        // Always return success to prevent email enumeration
        return { success: true, message: 'If an account exists with this email, a reset link has been sent.' }
    } catch (error) {
        console.error('Forgot password error:', error)
        return { error: 'Forgot Password Error: ' + (error instanceof Error ? error.message : String(error)) }
    }
}

export async function resetPassword(token: string, formData: FormData) {
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!password || password !== confirmPassword) {
        return { error: 'Passwords do not match or are empty' };
    }

    try {
        const player = await prisma.player.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date()
                }
            }
        });

        if (!player) {
            return { error: 'Invalid or expired reset token' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.player.update({
            where: { id: player.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        return { success: true };
    } catch (error) {
        console.error('Reset password error:', error);
        return { error: 'Reset Password Error: ' + (error instanceof Error ? error.message : String(error)) };
    }
}

export async function signup(prevState: any, formData: FormData) {
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string
    const email = formData.get('email') as string
    const birthday = formData.get('birthday') as string
    const dateStarted = formData.get('dateStarted') as string
    const preferredTeeBox = formData.get('preferredTeeBox') as string

    if (!firstName || !lastName || !email || !password) {
        return { error: 'Name, email, and password are required' }
    }

    const name = `${firstName} ${lastName}`.trim()

    // Check if email exists
    const existing = await prisma.player.findFirst({
        where: {
            email: {
                equals: email,
                mode: 'insensitive'
            }
        }
    })

    if (existing) {
        return { error: 'Player with this email already exists' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const newPlayer = await prisma.player.create({
            data: {
                // id will be auto-generated UUID
                name: name,
                email: email,
                phone: phone || null, // Optional
                password: hashedPassword,
                birthday: birthday || null,
                dateStarted: dateStarted || null,
                preferredTeeBox: preferredTeeBox || null,
                handicapIndex: 0
            }
        })

        // Auto login
        const cookieStore = await cookies()
        cookieStore.set('session_userId', newPlayer.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/'
        })
        cookieStore.set('auth_status', 'true', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        })

        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Signup Error: ' + (e instanceof Error ? e.message : String(e)) }
    }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session_userId')
    cookieStore.delete('auth_status')
    // We don't redirect here because we might want to just update UI state, 
    // but usually logout redirects to home.
    // The client side usually does window.location.reload() or router.refresh() 
    // after calling this action if we don't redirect.
    // Let's redirect to ensure state is clear.
    redirect('/')
}
