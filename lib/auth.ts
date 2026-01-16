import { createClient } from '@/lib/supabase/server'

export async function getSession() {
    const supabase = await createClient()

    try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) return null

        return {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.user_metadata?.name || null
        }
    } catch (error) {
        return null
    }
}
