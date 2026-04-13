const STREAMTIME_COMPANIES = 'https://api.streamtime.net/v1/companies'

export async function POST(request: Request) {
  const key = process.env.STREAMTIME_KEY
  if (!key) return Response.json({ error: 'STREAMTIME_KEY not configured' }, { status: 500 })

  const body = await request.json().catch(() => null) as { name?: string } | null
  if (!body?.name) return Response.json({ error: 'name is required' }, { status: 400 })

  const res = await fetch(STREAMTIME_COMPANIES, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: body.name,
      companyStatus: { id: 1 },
      taxNumber: null,
      phone1: null,
      phone2: null,
      websiteAddress: null,
    }),
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
