const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * Decode a base64 string to a Uint8Array. React Native has no global atob,
 * and fetch(uri).blob() produces broken uploads to Supabase storage, so we
 * decode the image bytes ourselves and upload those.
 */
export function decodeBase64(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '')
  const len = clean.length
  const bytes = new Uint8Array((len * 3) >> 2)
  let p = 0
  for (let i = 0; i < len; i += 4) {
    const c0 = CHARS.indexOf(clean[i])
    const c1 = CHARS.indexOf(clean[i + 1])
    const c2 = CHARS.indexOf(clean[i + 2])
    const c3 = CHARS.indexOf(clean[i + 3])
    bytes[p++] = (c0 << 2) | (c1 >> 4)
    if (c2 !== -1) bytes[p++] = ((c1 & 15) << 4) | (c2 >> 2)
    if (c3 !== -1) bytes[p++] = ((c2 & 3) << 6) | c3
  }
  return bytes
}
