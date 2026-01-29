import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Generate a random referral code
function generateReferralCode(firstName: string, lastName: string): string {
    const namePrefix = (firstName.substring(0, 2) + lastName.substring(0, 1)).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `${namePrefix}${random}`
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'


    if (code) {
        try {
            const supabase = await createClient()

            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

            if (exchangeError) {
                console.error('Exchange code error:', exchangeError)
                return NextResponse.redirect(`${origin}/auth/auth-code-error?error=exchange_failed`)
            }

            // Get the authenticated user
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            if (userError || !user) {
                console.error('Get user error:', userError)
                return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_user`)
            }


            // Check if creator profile exists
            const { data: existingCreator, error: selectError } = await supabase
                .from('creators')
                .select('id, status')
                .eq('id', user.id)
                .single()

            if (selectError && selectError.code !== 'PGRST116') {
                // PGRST116 = no rows returned (expected for new users)
                console.error('Select creator error:', selectError)
            }


            // Create creator profile if it doesn't exist (new OAuth user - Google or Facebook)
            if (!existingCreator) {

                const fullName = user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || 'User'
                const nameParts = fullName.trim().split(' ')
                const firstName = nameParts[0] || 'User'
                const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User'


                const referralCode = generateReferralCode(firstName, lastName)



                const { data: insertData, error: insertError } = await supabase
                    .from('creators')
                    .insert({
                        id: user.id,
                        phone: null, // Google OAuth doesn't provide phone numbers
                        first_name: firstName,
                        middle_name: null,
                        last_name: lastName,
                        email: user.email,
                        password_hash: 'oauth_google',
                        referral_code: referralCode,
                        status: 'active', // Set to active for OAuth users
                        role: 'creator',
                    })
                    .select()

                if (insertError) {
                    // Don't fail - user is authenticated, they can complete profile later
                }
            }

            // Check user role and redirect accordingly
            const { data: creatorRole } = await supabase
                .from('creators')
                .select('role')
                .eq('id', user.id)
                .single()

            const redirectPath = creatorRole?.role === 'admin' ? '/admin' : '/dashboard'

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${redirectPath}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
            } else {
                return NextResponse.redirect(`${origin}${redirectPath}`)
            }
        } catch (error) {
            console.error('=== AUTH CALLBACK FATAL ERROR ===')
            console.error(error)
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=fatal`)
        }
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`)
}
