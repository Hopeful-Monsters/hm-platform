import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const status = user?.user_metadata?.status

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-sans">
      <main className="w-full max-w-4xl rounded-3xl bg-white p-10 shadow-xl">
        <div className="flex flex-col gap-6 text-center">
          <h1 className="text-4xl font-bold text-zinc-900">Hopeful Monsters Platform</h1>
          {user ? (
            <div className="space-y-4">
              <p className="text-xl text-zinc-700">Welcome back, {user.email}.</p>
              {status === 'approved' ? (
                <p className="text-zinc-600">You are signed in and can access your tools below.</p>
              ) : (
                <p className="text-zinc-600">Your account is signed in but still pending approval. An admin will approve your access soon.</p>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/auth/login" className="rounded-full bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700">
                  Reload Status
                </Link>
                <Link href="/auth/no-access" className="rounded-full border border-blue-600 px-6 py-3 text-blue-600 transition hover:bg-blue-50">
                  Check Access
                </Link>
              </div>
              <div className="flex justify-center">
                <SignOutButton />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xl text-zinc-700">You are not signed in yet.</p>
              <p className="text-zinc-600">Sign in to start using the platform, or sign up to request approval.</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/auth/login" className="rounded-full bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="rounded-full border border-blue-600 px-6 py-3 text-blue-600 transition hover:bg-blue-50">
                  Sign Up
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
