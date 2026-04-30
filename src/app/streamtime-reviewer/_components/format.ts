// en-AU locale: thousands comma, decimal dot.

const num2 = new Intl.NumberFormat('en-AU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const num0 = new Intl.NumberFormat('en-AU', {
  maximumFractionDigits: 0,
})

export const fmt2 = (n: number) => num2.format(n)
export const fmt0 = (n: number) => num0.format(n)
export const fmtMoney = (n: number) => '$' + num0.format(Math.round(n))

/** Date string `YYYY-MM-DD` → `DD/MM`. */
export const fmtDateShort = (iso: string) => {
  const [, m, d] = iso.split('-')
  return d && m ? `${d}/${m}` : iso
}
