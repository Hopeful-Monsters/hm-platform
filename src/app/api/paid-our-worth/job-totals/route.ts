import { z } from 'zod'
import { fetchLoggedEntries } from '@/lib/streamtime/fetchLoggedEntries'
import { createApiRoute } from '@/lib/api/createApiRoute'
import { aggregateJobs, sumCurrentTime } from '@/app/paid-our-worth/_lib/aggregateJobs'

const BodySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const POST = createApiRoute({
  auth:   { tool: 'paid-our-worth' },
  schema: BodySchema,
  handler: async ({ body }) => {
    const { dateFrom, dateTo } = body
    const entries = await fetchLoggedEntries(dateFrom, dateTo)
    const jobTotals = aggregateJobs(entries).sort((a, b) => Number(a.jobId) - Number(b.jobId))
    const reportTotal = sumCurrentTime(jobTotals)
    return Response.json({ jobTotals, reportTotal })
  },
})
