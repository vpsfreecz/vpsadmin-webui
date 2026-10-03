import { describe, expect, it } from 'vitest';

import { sanitizeNewsHtml } from './sanitizeHtml';

describe('sanitizeNewsHtml', () => {
  it('keeps safe news links and adds rel protection', () => {
    const html = sanitizeNewsHtml(
      'Introducing <a href="https://status.vpsf.cz" target="_blank">status</a> and <a href="?page=security_advisory&action=list">advisories</a>.'
    );

    expect(html).toContain('<a href="https://status.vpsf.cz" rel="noopener noreferrer" target="_blank">status</a>');
    expect(html).toContain('<a href="?page=security_advisory&amp;action=list" rel="noopener noreferrer">advisories</a>');
  });

  it('removes scripts, event handlers and javascript links', () => {
    const html = sanitizeNewsHtml(
      '<script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(2)">bad</a><strong onmouseover="x">ok</strong>'
    );

    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onmouseover');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<a>bad</a>');
    expect(html).toContain('<strong>ok</strong>');
  });

  it('rejects protocol-relative links', () => {
    const html = sanitizeNewsHtml('<a href="//attacker.example/track">bad</a>');

    expect(html).toBe('<a>bad</a>');
  });
});


it('does not enable embedded PNG images in news HTML', () => {
  const html = sanitizeNewsHtml('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAIAAADeJhTwAAACsUlEQVR4nO2dwW7lIAwA61X//5fpcXOxhGXcTngzxydIE42MGzAk1lpfwuDfX9+A/EcZIJQBQhkglAFCGSCUAUIZIJQBQhkglAFCGSCUAUIZIJQB4rvaISKO30S2phIbf+vZN2uftdnp26G6VmRkgFAGCGW8OWc86ayfV/NB1ncnT+z8Xm2T0ck9RgYIZYBQxi0541QOOHXN2Mgl1fuZeK4MIwOEMkAo48accYr4xbkjGkYGCGWAUAYIXM7YYWd94slb8o2RAUIZIJRxY844NT+ziu8WnfbV+5nGyAChDBDKuCVnTPz/HsW5qZ32b3kvMTJAKAOEMkAE+eyQGBjfyc9rZIBQBghl3Lg/Y7oGKTbyx8R1Os9bxcgAoQwQyrjlPWOinnUNj/XZvVVzw8TaiZEBQhkglHHLe0Z1z111vToG6m4715muAzYyQCgDhDJuXAOffp+I4rkgHU6tvVcxMkAoA4QyPml/xs4+7WebNZAnOudNdfJHFSMDhDJAKOP286Y6Zz3FcP1up+90zZWRAUIZIJRx+3lTnXmqVdxLkdFp35l38j3jEhymQCjjk+amdnJD5zpPJua1OvVU1k29GIcpEMq4/eyQzliccWpd4dTc18SclZEBQhkglAECtw88GmvU2XUyOnNo7s+4HIcpEMoAgf5OX2cuqJpLfnPtJMPIAKEMEMoAgf5OXzT23FU5tb+kg5EBQhkglAEC952+1TibdjrHTOcVIwOEMkAoA8RrvrkUh848p+3/eGJkgFAGCGWAQOeM1VjnmKjHnT6/xMgAoQwQygCB+05fDNQ7ZX07+aOz1z3DyAChDBDKeHOt7XTdVAyfZbvDxFmHOxgZIJQBQhkgcPszPhkjA4QyQCgDhDJAKAOEMkAoA4QyQCgDhDJAKAOEMkAoA4QyQCjji8MPEXWBJ21s0UMAAAAASUVORK5CYII=">');
  expect(html).not.toContain('data:image/png');
});
