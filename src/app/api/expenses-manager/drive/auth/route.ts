/**
 * Drive OAuth initiation — expenses-manager entry point.
 *
 * Redirects to the platform-level /api/drive/auth route.
 * Kept for backward compatibility with bookmarked or cached links.
 *
 * The canonical auth URL is now /api/drive/auth.
 * Update the popup URL in useExpenses.ts to use /api/drive/auth directly.
 */

export async function GET(request: Request) {
  const url = new URL(request.url)
  return Response.redirect(`${url.origin}/api/drive/auth`, 301)
}
