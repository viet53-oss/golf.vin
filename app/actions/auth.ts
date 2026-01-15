'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string

    if (!phone || !password) {
        return { error: 'Phone and password are required' }
    }

    // Normalize phone (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, '')

    try {
        const player = await prisma.player.findFirst({
            where: {
                OR: [
                    { id: cleanPhone },
                    { phone: cleanPhone }, // exact match on phone field
                    { phone: phone } // match on raw input just in case
                ]
            }
        })

        if (!player || !player.password) {
            return { error: 'Invalid credentials' }
        }

        const isValid = await bcrypt.compare(password, player.password)

        if (!isValid) {
            return { error: 'Invalid credentials' }
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
        return { error: 'An unexpected error occurred' }
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

    if (!firstName || !lastName || !phone || !password) {
        return { error: 'Name, phone, and password are required' }
    }

    const name = `${firstName} ${lastName}`.trim()

    // Determine ID from phone (as requested: "use phone as player's id")
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
        return { error: 'Please enter a valid phone number' }
    }
    const playerId = cleanPhone;

    // Check if exists
    const existing = await prisma.player.findFirst({
        where: {
            OR: [
                { id: playerId },
                { phone: cleanPhone }
            ]
        }
    })

    if (existing) {
        return { error: 'Player with this phone already exists' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        await prisma.player.create({
            data: {
                id: playerId,
                name: name,
                phone: cleanPhone,
                password: hashedPassword,
                email: email || null,
                birthday: birthday || null,
                dateStarted: dateStarted || null,
                preferredTeeBox: preferredTeeBox || null,
                handicapIndex: 0
            }
        })

        // Auto login
        const cookieStore = await cookies()
        cookieStore.set('session_userId', playerId, {
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
        return { error: 'Failed to create player' }
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
