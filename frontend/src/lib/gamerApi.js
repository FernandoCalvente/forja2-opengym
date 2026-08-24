// Fetch wrapper for the Forja gamification service, mirroring lib/api.js's api() but pointed
// at /api/gamer/ (proxied by nginx to gamer-api). Session auth rides the same browser cookie
// openGym itself uses — gamer-api just asks openGym who it belongs to.
export async function gamerApi(path, opts) {
  const r = await fetch('/api/gamer' + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts))
  const data = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(data.error || ('HTTP ' + r.status)); e.status = r.status; throw e }
  return data
}
