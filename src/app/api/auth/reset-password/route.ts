import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    // Derive the site origin at runtime from the request so we never fall back
    // to localhost in production, regardless of whether NEXT_PUBLIC_SITE_URL is set.
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      `${request.headers.get('x-forwarded-proto') ?? 'https'}://${request.headers.get('host')}`;

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/forgot-password`,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
