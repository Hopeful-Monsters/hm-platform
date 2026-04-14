import { ImageResponse } from 'next/og'

// ── OG image metadata ─────────────────────────────────────────────
export const alt         = 'Hopeful Monsters — Tools for culture-led brands'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

// ── Image generation ──────────────────────────────────────────────
// Matches the brand asset: yellow bg (#FFE600), black Barlow-style type.
// ImageResponse supports flexbox + a subset of CSS — no grid, no imports.

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#FFE600',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          padding: '72px 80px',
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontFamily: 'sans-serif',
            fontWeight: 900,
            fontSize: 128,
            color: '#0A0A0A',
            textTransform: 'uppercase',
            lineHeight: 0.88,
            letterSpacing: '-0.02em',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>HOPEFUL</span>
          <span>MONSTERS.</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: 'sans-serif',
            fontWeight: 500,
            fontSize: 24,
            color: 'rgba(0,0,0,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginTop: 32,
          }}
        >
          Tools for culture-led brands.
        </div>
      </div>
    ),
    { ...size }
  )
}
