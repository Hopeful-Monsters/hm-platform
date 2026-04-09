import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const status = user?.user_metadata?.status
  const role = user?.user_metadata?.role

  // Get user's tool access
  let userTools: string[] = []
  if (user && status === 'approved') {
    const { data: toolAccess } = await supabase
      .from('tool_access')
      .select('tool_slug')
      .eq('user_id', user.id)
    userTools = toolAccess?.map(access => access.tool_slug) || []
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-sans">
      <main className="w-full max-w-4xl rounded-3xl bg-white p-10 shadow-xl">
        <div className="flex flex-col gap-6 text-center">
          <h1 className="text-4xl font-bold text-zinc-900">Hopeful Monsters Platform</h1>
          {user ? (
            <div className="space-y-6">
              <p className="text-xl text-zinc-700">Welcome back, {user.email}.</p>
              {status === 'approved' ? (
                <div className="space-y-4">
                  <p className="text-zinc-600">You have access to the following tools:</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    {userTools.includes('coverage-tracker') && (
                      <Link href="/coverage-tracker" className="rounded-full bg-green-600 px-6 py-3 text-white transition hover:bg-green-700">
                        Coverage Tracker
                      </Link>
                    )}
                    {userTools.includes('expenses-manager') && (
                      <Link href="/expenses-manager" className="rounded-full bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700">
                        Expenses Manager
                      </Link>
                    )}
                    {role === 'admin' && (
                      <Link href="/admin" className="rounded-full bg-purple-600 px-6 py-3 text-white transition hover:bg-purple-700">
                        Admin Dashboard
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-zinc-600">Your account is signed in but still pending approval.</p>
                  <p className="text-sm text-zinc-500">An admin will approve your access soon. Check back later or contact support.</p>
                </div>
              )}
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
