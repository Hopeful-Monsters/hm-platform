import { Resend } from 'resend'

export async function POST(request: Request) {
  const { email } = await request.json()
  const resend = new Resend(process.env.RESEND_API_KEY!)
  await resend.emails.send({
    from: 'admin@hm-platform.com',
    to: process.env.ADMIN_EMAIL || 'admin@hm-platform.com',
    subject: 'New User Signup',
    text: `New user signed up: ${email}. Please approve at /admin/approvals`
  })
  return Response.json({ ok: true })
}