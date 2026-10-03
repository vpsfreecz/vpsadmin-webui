import { describe, expect, it } from 'vitest';

import { safeAbsoluteHttpUrl, safeContentUrl } from './safeUrl';

describe('safeContentUrl', () => {
  it('allows local navigation and explicit safe protocols', () => {
    expect(safeContentUrl('/app/vps/42')).toBe('/app/vps/42');
    expect(safeContentUrl('?page=security')).toBe('?page=security');
    expect(safeContentUrl('#details')).toBe('#details');
    expect(safeContentUrl('https://status.vpsf.cz')).toBe('https://status.vpsf.cz');
    expect(safeContentUrl('mailto:support@vpsfree.cz', { allowMailto: true })).toBe(
      'mailto:support@vpsfree.cz',
    );
  });

  it('rejects executable and protocol-relative URLs', () => {
    expect(safeContentUrl('//attacker.example/pixel')).toBeNull();
    expect(safeContentUrl('/\\attacker.example/pixel')).toBeNull();
    expect(safeContentUrl('/\t/attacker.example/pixel')).toBeNull();
    expect(safeContentUrl('/\n/attacker.example/pixel')).toBeNull();
    expect(safeContentUrl('https:\\attacker.example/pixel')).toBeNull();
    expect(safeContentUrl('javascript:alert(1)')).toBeNull();
    expect(safeContentUrl('data:text/html,payload')).toBeNull();
    expect(safeContentUrl('mailto:support@vpsfree.cz')).toBeNull();
  });
});

describe('safeAbsoluteHttpUrl', () => {
  it('only returns absolute HTTP(S) URLs', () => {
    expect(safeAbsoluteHttpUrl('https://console.example.test')).toBe(
      'https://console.example.test',
    );
    expect(safeAbsoluteHttpUrl('/relative')).toBeNull();
    expect(safeAbsoluteHttpUrl('https:\\attacker.example/pixel')).toBeNull();
    expect(safeAbsoluteHttpUrl('https://example.test/\u0000pixel')).toBeNull();
    expect(safeAbsoluteHttpUrl('javascript:alert(1)')).toBeNull();
  });
});


describe('embedded payment PNG URLs', () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAIAAADeJhTwAAACsUlEQVR4nO2dwW7lIAwA61X//5fpcXOxhGXcTngzxydIE42MGzAk1lpfwuDfX9+A/EcZIJQBQhkglAFCGSCUAUIZIJQBQhkglAFCGSCUAUIZIJQB4rvaISKO30S2phIbf+vZN2uftdnp26G6VmRkgFAGCGW8OWc86ayfV/NB1ncnT+z8Xm2T0ck9RgYIZYBQxi0541QOOHXN2Mgl1fuZeK4MIwOEMkAo48accYr4xbkjGkYGCGWAUAYIXM7YYWd94slb8o2RAUIZIJRxY844NT+ziu8WnfbV+5nGyAChDBDKuCVnTPz/HsW5qZ32b3kvMTJAKAOEMkAE+eyQGBjfyc9rZIBQBghl3Lg/Y7oGKTbyx8R1Os9bxcgAoQwQyrjlPWOinnUNj/XZvVVzw8TaiZEBQhkglHHLe0Z1z111vToG6m4715muAzYyQCgDhDJuXAOffp+I4rkgHU6tvVcxMkAoA4QyPml/xs4+7WebNZAnOudNdfJHFSMDhDJAKOP286Y6Zz3FcP1up+90zZWRAUIZIJRx+3lTnXmqVdxLkdFp35l38j3jEhymQCjjk+amdnJD5zpPJua1OvVU1k29GIcpEMq4/eyQzliccWpd4dTc18SclZEBQhkglAECtw88GmvU2XUyOnNo7s+4HIcpEMoAgf5OX2cuqJpLfnPtJMPIAKEMEMoAgf5OXzT23FU5tb+kg5EBQhkglAEC952+1TibdjrHTOcVIwOEMkAoA8RrvrkUh848p+3/eGJkgFAGCGWAQOeM1VjnmKjHnT6/xMgAoQwQygCB+05fDNQ7ZX07+aOz1z3DyAChDBDKeHOt7XTdVAyfZbvDxFmHOxgZIJQBQhkgcPszPhkjA4QyQCgDhDJAKAOEMkAoA4QyQCgDhDJAKAOEMkAoA4QyQCjji8MPEXWBJ21s0UMAAAAASUVORK5CYII=';
  it('requires an explicit image opt-in and preserves the exact bytes', () => {
    expect(safeContentUrl(png)).toBeNull();
    expect(safeContentUrl(png, { allowPngDataImage: true })).toBe(png);
  });
  it.each([
    'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj4=',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/png;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj4=',
    'data:image/png;base64,',
    'data:image/png;base64,iVBORw0KGgo!',
    'data:image/png;base64,iVBORw0KGgo=\nAAAA',
    'data:image/png;charset=utf-8;base64,iVBORw0KGgo=',
    'data:image/png;base64,iVBORw0KGgo=' + 'A'.repeat(1024 * 1024),
  ])('rejects non-PNG, malformed and oversized data', (value) => {
    expect(safeContentUrl(value, { allowPngDataImage: true })).toBeNull();
  });
});
