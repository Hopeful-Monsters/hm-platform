const STREAMTIME_EXPENSES = 'https://api.streamtime.net/v1/logged_expenses'

export async function POST(request: Request) {
  const key = process.env.STREAMTIME_KEY
  if (!key) return Response.json({ error: 'STREAMTIME_KEY not configured' }, { status: 500 })

  const body = await request.text()
  const res = await fetch(STREAMTIME_EXPENSES, {
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
