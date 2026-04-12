const STREAMTIME_SEARCH = 'https://api.streamtime.net/v1/search?search_view=12&include_statistics=false'
const PAGE_SIZE = 200
const MAX_RESULTS = 2000

export async function GET() {
  const key = process.env.STREAMTIME_KEY
  if (!key) return Response.json({ error: 'STREAMTIME_KEY not configured' }, { status: 500 })

  let offset = 0
  let allResults: Array<{ id: unknown; name: unknown }> = []

  while (allResults.length < MAX_RESULTS) {
    const res = await fetch(STREAMTIME_SEARCH, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wildcardSearch: '',
        offset,
        maxResults: PAGE_SIZE,
        filterGroupCollection: { conditionMatchTypeId: 1, filterGroupCollections: [], filterGroups: [] },
      }),
    })

    if (!res.ok) break

    const data = await res.json() as { searchResults?: Array<Record<string, unknown>> }
    const page = (data.searchResults || []).map(r => ({
      id:   r['id'] ?? r['companyId'],
      name: r['name'] ?? r['companyName'] ?? r['Company Name'],
    })).filter(r => r.id && r.name)

    allResults = allResults.concat(page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return Response.json({ companies: allResults })
}
