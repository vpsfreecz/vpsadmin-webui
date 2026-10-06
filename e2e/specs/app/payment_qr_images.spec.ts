import { test, expect } from '../../fixtures/bootstrap';
import { setupHaveApiMock } from '../../fixtures/haveapi';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { withAppUrl } from '../../fixtures/url';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

// Synthetic QR contents are plain test labels, not usable payment orders.
const qrImages = {
  CZK: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAIAAADeJhTwAAACsUlEQVR4nO2dwW7lIAwA61X//5fpcXOxhGXcTngzxydIE42MGzAk1lpfwuDfX9+A/EcZIJQBQhkglAFCGSCUAUIZIJQBQhkglAFCGSCUAUIZIJQB4rvaISKO30S2phIbf+vZN2uftdnp26G6VmRkgFAGCGW8OWc86ayfV/NB1ncnT+z8Xm2T0ck9RgYIZYBQxi0541QOOHXN2Mgl1fuZeK4MIwOEMkAo48accYr4xbkjGkYGCGWAUAYIXM7YYWd94slb8o2RAUIZIJRxY844NT+ziu8WnfbV+5nGyAChDBDKuCVnTPz/HsW5qZ32b3kvMTJAKAOEMkAE+eyQGBjfyc9rZIBQBghl3Lg/Y7oGKTbyx8R1Os9bxcgAoQwQyrjlPWOinnUNj/XZvVVzw8TaiZEBQhkglHHLe0Z1z111vToG6m4715muAzYyQCgDhDJuXAOffp+I4rkgHU6tvVcxMkAoA4QyPml/xs4+7WebNZAnOudNdfJHFSMDhDJAKOP286Y6Zz3FcP1up+90zZWRAUIZIJRx+3lTnXmqVdxLkdFp35l38j3jEhymQCjjk+amdnJD5zpPJua1OvVU1k29GIcpEMq4/eyQzliccWpd4dTc18SclZEBQhkglAECtw88GmvU2XUyOnNo7s+4HIcpEMoAgf5OX2cuqJpLfnPtJMPIAKEMEMoAgf5OXzT23FU5tb+kg5EBQhkglAEC952+1TibdjrHTOcVIwOEMkAoA8RrvrkUh848p+3/eGJkgFAGCGWAQOeM1VjnmKjHnT6/xMgAoQwQygCB+05fDNQ7ZX07+aOz1z3DyAChDBDKeHOt7XTdVAyfZbvDxFmHOxgZIJQBQhkgcPszPhkjA4QyQCgDhDJAKAOEMkAoA4QyQCgDhDJAKAOEMkAoA4QyQCjji8MPEXWBJ21s0UMAAAAASUVORK5CYII=',
  EUR: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAIAAADeJhTwAAACqklEQVR4nO2dS67cMAzAnore/8rusrMxYEFWhtEj14knA0JS/ItjrfUjDP58+wHkP8oAoQwQygChDBDKAKEMEMoAoQwQygChDBDKAKEMEMoAoQwQf7M3RMT1h/icU4lk+yf37q6p/G722U4wMkAoA4Qy3lwzPqnMn5/k6LVpv3LvyTN3/68dRgYIZYBQxpSacSuPZ/sEK1kPdu08+b9OMDJAKAOEMibWjA5WQz+DjJEBQhkglAECVzOi0CfYtfMWjAwQygChjIk1o+O9PpJz2h082V8xMkAoA4QyptSMJ/N1JMejTtZHVca+OjAyQCgDhDJABG3cPw76Ftl7s+18CyMDhDJAKGP6/ozs+/uttUyruT/R/b+MDBDKAKGM37Q/ozKnvQ7W1FbmPDrGpir9GCMDhDJAKGPK2FS2HtzK3SvZn9i1eWt/eOV5PjEyQCgDhDKm14yOPBsN7/63ftc9fQMxTYFQxsSa8Unl/X1dumZ3/Q5C/TAyQCgDhDKmr5vq7mesB3P6rbGvE4wMEMoAoYyJ66ZufQMqCrUh2//oqAf2M4ZgmgKhjIn9jEoN+BZxaT7c+YyBmKZAKOPNNaNj/uCknSjk945vjXTUEiMDhDJAKOPNY1O33qlPxp1ik4s78v6OJ/scRgYIZYBQBgjcOX2rYW7jhI69h1mMDBDKAKEMELhz+qIwd12pHx3rcR2bejGmKRDKAPGac/qisGbp1hhX9zfYjQwQygChDBC4M5e6ufW99JP2sxgZIJQBQhkgcDUjDvL4rb3lt/ZzZPtDO4wMEMoAoQwQo87pWw3jWk+OWRkZIJQBQhkg0Of07cjOT3TsQXE+YzimKRDKAIE7p+83Y2SAUAYIZYBQBghlgFAGCGWAUAYIZYBQBghlgFAGCGWAUAYIZfxw+Aex/5wGNxEezQAAAABJRU5ErkJggg==',
} as const;

for (const source of ['embedded', 'external'] as const) {
  for (const language of ['cs', 'en'] as const) {
    test(`${source} CZK/EUR payment QR images load in ${language} @pr-smoke @pr-smoke-mobile`, async ({
      page, hasTouch,
    }, testInfo) => {
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      // The external case mirrors the production ERB URL shape. All responses
      // remain synthetic; no member data or real payment generator is contacted.
      const sources = Object.fromEntries(
        Object.entries(qrImages).map(([currency, data]) => [
          currency,
          source === 'embedded'
            ? data
            : `https://qr.example.test/nastroje/qr.php?country=${currency === 'CZK' ? 'cz' : 'sk'}&amount=900&vs=7`,
        ])
      );
      await page.route('https://qr.example.test/nastroje/qr.php?*', async (route) => {
        const currency = new URL(route.request().url()).searchParams.get('country') === 'cz' ? 'CZK' : 'EUR';
        await route.fulfill({
          contentType: 'image/png',
          body: Buffer.from(qrImages[currency].split(',')[1]!, 'base64'),
        });
      });
      await setupHaveApiMock(page, {
        user: { id: 7, login: 'qr-test-member', level: 1, preferred_session_length: 2400 },
        handlers: {
          'GET users/7/get_payment_instructions': () => ({
            instructions: Object.entries(sources)
              .map(
                ([currency, src]) => `
            <h3>Payment in ${currency}</h3>
            <table><tr><td>Test reference:</td><td>SYNTHETIC ${currency}</td>
              <td rowspan="8"><img alt="${currency} QR" src="${src}"></td></tr>
              <tr><td>Variable symbol:</td><td>7</td></tr>
              ${Array.from({ length: 6 }, (_, i) => `<tr><td>Test field ${i + 1}:</td><td>SYNTHETIC ${currency}</td></tr>`).join('')}
            </table>
          `
              )
              .join(''),
          }),
          'GET user_payments': () => ({ user_payments: [] }),
        },
      });
      await page.route('**/app/payments', async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          headers: {
            ...response.headers(),
            // Mirrors the evaluated Nix module fixture's img-src. Vite needs its
            // development script policy, so only the relevant directive is set.
            'content-security-policy':
              "img-src 'self' data: https://www.openstreetmap.org https://qr.example.test/nastroje/qr.php;",
          },
        });
      });
      await page.goto(withAppUrl('/app/payments'));
      const instructions = page.getByTestId('payments.my.instructions.text');
      await expect(
        instructions.getByRole('heading', { name: language === 'cs' ? 'Platba v CZK' : 'Payment in CZK', exact: true })
      ).toBeVisible();
      for (const currency of ['CZK', 'EUR'] as const) {
        const image = instructions.getByRole('img', { name: `${currency} QR`, exact: true });
        // Locale bootstrap can replace sanitized innerHTML while scrolling.
        await expect(async () => {
          await image.scrollIntoViewIfNeeded({ timeout: 2000 });
        }).toPass({ timeout: 10000 });
        await expect(image).toHaveAttribute('src', sources[currency]!);
        await expect
          .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
          .toBe(true);
        if (source === 'embedded') {
          const pixels = await image.evaluate((img: HTMLImageElement) => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let dark = 0;
            let light = 0;
            for (let i = 0; i < data.length; i += 4) {
              if (data[i]! < 32) dark += 1;
              if (data[i]! > 223) light += 1;
            }
            return { dark, light };
          });
          expect(pixels.dark).toBeGreaterThan(100);
          expect(pixels.light).toBeGreaterThan(100);
        }
        const box = await image.boundingBox();
        expect(box?.width).toBeGreaterThan(64);
        expect(box?.height).toBeGreaterThan(64);
      }
      // Inactivity tracking updates auth context at most once per second.
      // Preserve loaded QR nodes even when activity re-renders their parent.
      const images = await instructions.locator('img').elementHandles();
      const viewport = page.viewportSize()!;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.mouse.move(viewport.width - 20, viewport.height / 2);
      for (const delta of [240, -240, 300, -300]) {
        await page.waitForTimeout(1100);
        const previousY = await page.evaluate(() => window.scrollY);
        if (hasTouch) {
          // Playwright cannot wheel/swipe in mobile WebKit. A real tap triggers
          // the same trusted activity handler; scroll the viewport separately.
          await page.touchscreen.tap(viewport.width - 8, viewport.height / 2);
          await page.evaluate(dy => window.scrollBy(0, dy), delta);
        } else {
          await page.mouse.wheel(0, delta);
        }
        await expect.poll(() => page.evaluate(() => window.scrollY)).not.toBe(previousY);
        await page.waitForTimeout(100);
        for (const image of images) {
          expect(
            await image.evaluate((img: HTMLImageElement) => img.isConnected && img.complete && img.naturalWidth > 0),
            'Decoded QR node survives scroll/idle refresh',
          ).toBe(true);
        }
      }
      // A path-qualified allowance must not permit other images on that host.
      const blocked = await page.evaluate(async () => {
        const image = new Image();
        const result = new Promise<boolean>((resolve) => {
          const onViolation = (event: SecurityPolicyViolationEvent) => {
            if (event.blockedURI !== 'https://qr.example.test/unreviewed.png') return;
            document.removeEventListener('securitypolicyviolation', onViolation);
            resolve(event.effectiveDirective === 'img-src');
          };
          document.addEventListener('securitypolicyviolation', onViolation);
          setTimeout(() => {
            document.removeEventListener('securitypolicyviolation', onViolation);
            resolve(false);
          }, 2000);
        });
        image.src = 'https://qr.example.test/unreviewed.png';
        return result;
      });
      expect(blocked).toBe(true);
      await expectNoDocumentHorizontalOverflow(page);
      await instructions.screenshot({ path: testInfo.outputPath(`payment-qr-${source}-${language}.png`) });
    });
  }
}
