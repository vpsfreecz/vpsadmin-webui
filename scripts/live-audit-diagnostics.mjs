/** Live diagnostics deliberately omit free-form server, browser and error text. */
export function diagnosticKind(error) {
  const name = error?.name;
  return ['Error', 'TypeError', 'SyntaxError', 'TimeoutError', 'AbortError', 'AssertionError'].includes(name) ? name : 'Error';
}

export function responseMetadata(rawUrl, status, contentType) {
  let url = '[invalid URL]';
  try {
    const parsed = new URL(rawUrl);
    if (['http:', 'https:'].includes(parsed.protocol)) url = `${parsed.origin}${parsed.pathname}`;
  } catch { /* Keep malformed URLs out of evidence too. */ }
  const mime = String(contentType).split(';')[0].trim().toLowerCase();
  const knownMime = ['application/json', 'text/html', 'application/javascript', 'text/javascript', 'text/css'].includes(mime) ? mime : 'application/octet-stream';
  return { url, status, contentType: knownMime };
}
