import { afterEach, expect, vi } from 'vitest';

interface WireResponse {
  status?: number;
  ok?: boolean;
  text?: () => Promise<string>;
  json?: () => Promise<unknown>;
}
type Responder = (url: string, init?: RequestInit) => WireResponse | Promise<WireResponse>;

/** HTTP fixtures for the actual package; this never calls or delegates to fetch. */
export const apiWire: { respond: Responder; requests: ControlledHaveApiXhr[] } = {
  respond: unconfiguredResponder(),
  requests: [] as ControlledHaveApiXhr[],
};
let epoch = 0;
const unexpected: string[] = [];
function unconfiguredResponder() {
  return vi.fn<Responder>((url, init) => {
    const request = `${init?.method} ${url}`;
    unexpected.push(request);
    throw new Error(`No XHR fixture for ${request}`);
  });
}

export function installHaveApiXhr(responder: Responder): void {
  apiWire.respond = responder as typeof apiWire.respond;
}

class ControlledHaveApiXhr {
  readyState = 0;
  status = 0;
  responseText = '';
  withCredentials = false;
  onreadystatechange: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: string | undefined;
  aborted = false;

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
    this.readyState = 1;
  }
  setRequestHeader(name: string, value: string): void {
    this.headers[name] = value;
  }
  send(body?: string): void {
    this.body = body;
    apiWire.requests.push(this);
    const generation = epoch;
    // RequestInit is just an inspection shape shared with existing HTTP fixtures.
    // The package still creates XHR, serializes bytes, and decodes responseText.
    const init: RequestInit = {
      method: this.method,
      headers: this.headers,
      body,
      credentials: this.withCredentials ? 'include' : 'same-origin',
    };
    Promise.resolve()
      .then(() => {
        if (this.aborted || generation !== epoch) return;
        return apiWire.respond(this.url, init);
      })
      .then(async (response) => {
        if (this.aborted || generation !== epoch) return;
        if (!response) {
          unexpected.push(`${this.method} ${this.url}`);
          throw new Error(`No XHR response for ${this.method} ${this.url}`);
        }
        const text = response.text ? await response.text() : JSON.stringify(await response.json!());
        if (this.aborted || generation !== epoch) return;
        this.status = response.status ?? (response.ok === false ? 500 : 200);
        this.responseText = text;
        this.readyState = 4;
        this.onreadystatechange?.();
      })
      .catch(() => {
        if (!this.aborted && generation === epoch) this.onerror?.();
      });
  }
  abort(): void {
    this.aborted = true;
    this.onabort?.();
  }
}

// UMD captures window.XMLHttpRequest at import time. Install one stable test
// constructor in vitest.setup, then change only responders between tests.
Object.defineProperty(globalThis, 'XMLHttpRequest', {
  configurable: true,
  writable: true,
  value: ControlledHaveApiXhr,
});
afterEach(() => {
  epoch += 1;
  apiWire.requests = [];
  apiWire.respond = unconfiguredResponder();
  const missing = unexpected.splice(0);
  expect(missing, 'Unexpected HaveAPI XHR sends without a response fixture').toEqual([]);
});
