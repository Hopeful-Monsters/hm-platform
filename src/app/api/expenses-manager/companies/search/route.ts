const STREAMTIME_SEARCH = 'https://api.streamtime.net/v1/search?search_view=12&include_statistics=false'

export async function POST(request: Request) {
  const key = process.env.STREAMTIME_KEY
  if (!key) return Response.json({ error: 'STREAMTIME_KEY not configured' }, { status: 500 })

  const body = await request.json().catch(() => null) as { query?: string } | null
  const query = body?.query ?? ''

  const searchBody = JSON.stringify({
    wildcardSearch: query,
    offset: 0,
    maxResults: 10,
    filterGroupCollection: { conditionMatchTypeId: 1, filterGroupCollections: [], filterGroups: [] },
  })

  const res = await fetch(STREAMTIME_SEARCH, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: searchBody,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    return Response.json(
      { error: err.message || `Streamtime ${res.status}` },
      { status: res.status }
    )
  }

  const data = await res.json() as {
    searchResults?: Array<Record<string, unknown>>
    results?: Array<Record<string, unknown>>
  }
  const results = (data.searchResults || data.results || []).map(r => ({
    id:   r['id'] ?? r['companyId'] ?? r['Company ID'],
    name: r['name'] ?? r['companyName'] ?? r['Company Name'] ?? r['Name'],
  })).filter(r => r.id && r.name)

  return Response.json({ results })
}
