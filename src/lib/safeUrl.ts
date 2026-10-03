const LOCAL_URL_BASE = 'https://vpsadmin.invalid/';
const UNSAFE_URL_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

function normalizedUrl(raw: string, base?: string): { value: string; url: URL } | null {
  const value = raw.trim();
  if (!value || UNSAFE_URL_CHARACTERS.test(value)) return null;

  try {
    return { value, url: new URL(value, base) };
  } catch {
    return null;
  }
}

export function safeContentUrl(
  raw: string,
  options: { allowMailto?: boolean; allowPngDataImage?: boolean } = {},
): string | null {
  // Payment instructions embed PNG QR codes. Keep this opt-in separate from
  // navigation URLs and reject SVG, arbitrary data MIME types and malformed data.
  if (options.allowPngDataImage && raw.length <= 1024 * 1024) {
    const value = raw.trim();
    const prefix = 'data:image/png;base64,';
    if (value.startsWith(prefix)) {
      const encoded = value.slice(prefix.length);
      if (
        encoded.length >= 12 &&
        encoded.length % 4 === 0 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(encoded) &&
        atob(encoded.slice(0, 12)).startsWith('\x89PNG\r\n\x1a\n')
      ) return value;
      return null;
    }
  }

  const parsed = normalizedUrl(raw, LOCAL_URL_BASE);
  if (!parsed) return null;

  const { value, url } = parsed;
  if (value.startsWith('/') || value.startsWith('?') || value.startsWith('#')) {
    return url.origin === LOCAL_URL_BASE.slice(0, -1) ? value : null;
  }

  if (url.protocol === 'http:' || url.protocol === 'https:') return value;
  if (options.allowMailto && url.protocol === 'mailto:') return value;
  return null;
}

export function safeAbsoluteHttpUrl(raw: string): string | null {
  const parsed = normalizedUrl(raw);
  if (!parsed) return null;
  return parsed.url.protocol === 'http:' || parsed.url.protocol === 'https:'
    ? parsed.value
    : null;
}
