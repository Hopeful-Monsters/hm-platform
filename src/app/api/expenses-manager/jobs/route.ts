const STREAMTIME_SEARCH = 'https://api.streamtime.net/v1/search?search_view=7&include_statistics=false'

export async function POST(request: Request) {
  const key = process.env.STREAMTIME_KEY
  if (!key) return Response.json({ error: 'STREAMTIME_KEY not configured' }, { status: 500 })

  const body = await request.text()
  const res = await fetch(STREAMTIME_SEARCH, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body,
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
