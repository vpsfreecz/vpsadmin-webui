import { expect, test, type Page } from "@playwright/test";

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from "../../fixtures";

function downloadItemPrefix(page: Page, id: number) {
  const mobile = (page.viewportSize()?.width ?? 1024) < 768;
  return `dataset.downloads.${mobile ? "card" : "row"}.${id}`;
}

test.describe("@smoke Dataset downloads", () => {
  test("@content-storage-download-cs Czech ready downloads retain actions and one fallback ID", async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: "TEST" });
    await setUiSettingsLocalStorage(page, { language: "cs", theme: "dark" });
    await installHaveApiMock(page, {
      user: { id: 1, login: "member", level: 1 },
      handlers: {
        "GET datasets/10": () => ({ dataset: {
          id: 10, name: "ds10", full_name: "tank/vps/ds10",
          user: { id: 1, login: "member" }, object_state: "active",
          vps: { id: 300, hostname: "alpha.example" },
        } }),
        "GET transaction_chains": () => ({ transaction_chains: [] }),
        "GET snapshot_downloads": () => ({ snapshot_downloads: [
          {
            id: 601, snapshot: { id: 201, label: "ready-named" },
            format: "archive", file_name: "ready-601.tar.gz", ready: true,
            url: "https://example.test/ready-601.tar.gz", size: 128,
            expires_at: "2099-02-10T00:00:00.000Z",
          },
          {
            id: 602, snapshot: { id: 202, label: "ready-unnamed" },
            format: "stream", ready: true,
            url: "https://example.test/ready-602.zfs",
            expires_at: "2099-02-10T00:00:00.000Z",
          },
        ] }),
      },
    });

    await page.goto("/app/datasets/10/downloads");
    await expect(page.getByTestId("dataset.header")).toContainText("tank/vps/ds10");
    for (const id of [601, 602]) {
      const prefix = downloadItemPrefix(page, id);
      await expect(page.getByTestId(prefix)).toContainText("Připraveno");
      await expect(page.getByTestId(`${prefix}.download`)).toHaveAttribute("href", new RegExp(`ready-${id}`));
      await expect(page.getByTestId(`${prefix}.copy_link`)).toBeVisible();
      await expect(page.getByTestId(`${prefix}.delete`)).toBeEnabled();
    }
    await expect(page.getByTestId(downloadItemPrefix(page, 601))).toContainText("ready-601.tar.gz");
    const unnamed = page.getByTestId(downloadItemPrefix(page, 602));
    await expect(unnamed).toContainText("Stažení #602");
    await page.screenshot({ path: testInfo.outputPath("downloads-ready-cs.png"), fullPage: true, scale: "css" });
    expect.soft((await unnamed.innerText()).match(/#602\b/g)).toHaveLength(1);
  });

  test("create backup deep link opens the create workflow and loads snapshots", async ({
    page,
  }) => {
    await bootstrapVpsAdminWindow(page, {
      sessionToken: "TEST",
    });

    await installHaveApiMock(page, {
      user: { id: 1, login: "admin", level: 99 },
      handlers: {
        "GET datasets/10": () => ({ dataset: {
          id: 10,
          full_name: "tank/vps/ds10",
          name: "ds10",
          used: 2048,
          refquota: 10240,
          snapshots_count: 1,
          mount_count: 0,
          export_count: 0,
          object_state: "active",
          vps: { id: 300, hostname: "alpha.example" },
        } }),

        "GET snapshot_downloads": () => ({ snapshot_downloads: [] }),

        "GET datasets/10/snapshots": () => ({
          snapshots: [
            {
              id: 200,
              dataset: { id: 10 },
              name: "snap-200",
              label: "snap-200",
              created_at: "2026-01-26T00:00:00.000Z",
            },
          ],
        }),
      },
    });

    await page.goto("/app/datasets/10/downloads?action=create");

    await expect(page.getByTestId("dataset.downloads.list")).toBeVisible();
    await expect(
      page.getByTestId("dataset.downloads.create.modal"),
    ).toBeVisible();
    await expect(
      page.getByTestId("dataset.downloads.create.snapshot"),
    ).toContainText("snap-200");
    await expect(page).toHaveURL(/\/app\/datasets\/10\/downloads$/);
  });

  test("@pr-smoke @pr-smoke-mobile clears a dismissed download creation error and retries cleanly", async ({
    page,
  }) => {
    let createAttempts = 0;

    await bootstrapVpsAdminWindow(page, { sessionToken: "TEST" });
    await installHaveApiMock(page, {
      user: { id: 1, login: "admin", level: 99 },
      handlers: {
        "GET datasets/10": () => ({ dataset: {
          id: 10,
          full_name: "tank/vps/ds10",
          name: "ds10",
          object_state: "active",
          vps: { id: 300, hostname: "alpha.example" },
        } }),
        "GET transaction_chains": () => ({ transaction_chains: [] }),
        "GET snapshot_downloads": () => ({ snapshot_downloads: [] }),
        "GET datasets/10/snapshots": () => ({
          snapshots: [{
            id: 200,
            dataset: { id: 10 },
            name: "snap-200",
            label: "Before migration",
            created_at: "2026-01-26T00:00:00.000Z",
          }],
        }),
        "POST snapshot_downloads": () => {
          createAttempts += 1;
          if (createAttempts === 1) {
            return {
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({ status: false, message: "Download creation rejected" }),
            };
          }
          return { snapshot_download: { id: 501 } };
        },
      },
    });

    await page.goto("/app/datasets/10/downloads?action=create");
    await page.getByTestId("dataset.downloads.create.snapshot").selectOption("200");
    await page.getByTestId("dataset.downloads.create.submit").click();

    await expect(page.getByTestId("dataset.downloads.create.modal")).toContainText(
      "Download creation rejected",
    );
    await expect(page.getByTestId("dataset.downloads.create.snapshot")).toHaveValue("200");

    await page.getByTestId("dataset.downloads.create.cancel").click();
    await page.getByTestId("dataset.downloads.create.open").click();
    await expect(page.getByTestId("dataset.downloads.create.modal")).not.toContainText(
      "Download creation rejected",
    );

    await page.getByTestId("dataset.downloads.create.submit").click();
    await expect(page.getByTestId("dataset.downloads.create.modal")).toHaveCount(0);
    expect(createAttempts).toBe(2);
  });

  test("@pr-smoke @pr-smoke-mobile loads older snapshot candidates with the API cursor", async ({
    page,
  }) => {
    const requestedSnapshotParams: URLSearchParams[] = [];
    const makeSnapshot = (id: number) => ({
      id,
      dataset: { id: 10 },
      name: `snap-${id}`,
      label: `Snapshot ${id}`,
      created_at: "2026-01-26T00:00:00.000Z",
    });
    const firstBatch = Array.from({ length: 101 }, (_, index) =>
      makeSnapshot(index + 1),
    );
    const secondBatch = Array.from({ length: 100 }, (_, index) =>
      makeSnapshot(index + 101),
    );

    await bootstrapVpsAdminWindow(page, { sessionToken: "TEST" });
    await installHaveApiMock(page, {
      user: { id: 1, login: "admin", level: 99 },
      handlers: {
        "GET datasets/10": () => ({ dataset: {
          id: 10,
          full_name: "tank/vps/ds10",
          name: "ds10",
          used: 2048,
          refquota: 10240,
          snapshots_count: 200,
          mount_count: 0,
          export_count: 0,
          object_state: "active",
          vps: { id: 300, hostname: "alpha.example" },
        } }),
        "GET snapshot_downloads": () => ({ snapshot_downloads: [] }),
        "GET datasets/10/snapshots": ({ searchParams }) => {
          requestedSnapshotParams.push(new URLSearchParams(searchParams));
          return searchParams.get("snapshot[from_id]") === "100"
            ? { snapshots: secondBatch }
            : { snapshots: firstBatch };
        },
      },
    });

    await page.goto("/app/datasets/10/downloads?action=create");
    const snapshotSelect = page.getByTestId("dataset.downloads.create.snapshot");
    const loadMore = page.getByTestId("dataset.downloads.create.load_more");

    await expect(snapshotSelect.locator('option[value="100"]')).toHaveCount(1);
    await expect(snapshotSelect.locator('option[value="101"]')).toHaveCount(0);
    await expect(loadMore).toBeEnabled();
    await loadMore.click();
    await expect(snapshotSelect.locator('option[value="200"]')).toHaveCount(1);
    await expect(loadMore).toBeDisabled();

    expect(requestedSnapshotParams).toHaveLength(2);
    expect(requestedSnapshotParams[0]?.get("snapshot[limit]")).toBe("101");
    expect(requestedSnapshotParams[0]?.has("snapshot[from_id]")).toBe(false);
    expect(requestedSnapshotParams[1]?.get("snapshot[from_id]")).toBe("100");
  });

  test('@content-storage-download-review creates download, tracks action state, and shows details from the API', async ({
    page,
  }, testInfo) => {
    const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
    const itemPrefix = downloadItemPrefix(page, 501);
    let created = false;

    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'TEST',
    });
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });

    await installHaveApiMock(page, {
      user: { id: 1, login: 'admin', level: 99 },
      handlers: {
        'GET datasets/10': () => ({
          dataset: {
            id: 10,
            full_name: 'tank/vps/ds10',
            name: 'ds10',
            used: 2048,
            refquota: 10240,
            snapshots_count: 2,
            mount_count: 0,
            export_count: 0,
            object_state: 'active',
            vps: { id: 300, hostname: 'alpha.example' },
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET datasets/10/snapshots': () => ({
          snapshots: [
            {
              id: 200,
              dataset: { id: 10 },
              name: 'snap-200',
              label: 'base',
              created_at: '2026-01-25T00:00:00.000Z',
            },
            {
              id: 201,
              dataset: { id: 10 },
              name: 'snap-201',
              label: 'target',
              created_at: '2026-01-26T00:00:00.000Z',
            },
          ],
        }),
        'GET snapshot_downloads': () => ({
          snapshot_downloads: created
            ? [
                {
                  id: 501,
                  dataset: 10,
                  snapshot: { id: 201, label: 'target' },
                  from_snapshot: { id: 200, label: 'base' },
                  format: 'incremental_stream',
                  ready: true,
                  url: 'https://example.test/incremental.zfs',
                  file_name: 'incremental.zfs',
                  size: 128,
                  sha256sum: 'b'.repeat(64),
                  expires_at: '2099-12-10T00:00:00.000Z',
                },
              ]
            : [],
        }),
        'POST snapshot_downloads': () => {
          created = true;
          return {
            snapshot_download: { id: 501 },
            _meta: { action_state_id: 702 },
          };
        },
        'GET action_states/702': () => ({
          action_state: {
            id: 702,
            label: 'Create snapshot download',
            status: true,
            finished: false,
            current: 1,
            total: 3,
          },
        }),
      },
    });

    await page.goto('/app/datasets/10/downloads?action=create');

    await page.getByTestId('dataset.downloads.create.snapshot').selectOption('201');
    const createModal = page.getByTestId('dataset.downloads.create.modal');
    const scrollBody = createModal.locator('..');
    const review = page.getByTestId('dataset.downloads.create.review');
    await expect(createModal).toContainText(
      language === 'cs'
        ? 'Vyber snapshot a formát pro dočasný odkaz ke stažení. Pokud je dostupné sledování průběhu, najdeš ho v panelu Úlohy.'
        : 'Select a snapshot and format for a temporary download link. You can follow progress in Tasks when tracking is available.'
    );
    await expect(review).not.toContainText(
      language === 'cs'
        ? 'Před vytvořením vygenerovaného odkazu zkontroluj zdrojový snapshot a životní cyklus.'
        : 'Check the source snapshot and lifecycle before creating the generated link.'
    );
    await expect(review.locator('li')).toHaveCount(3);
    await scrollBody.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(review.locator('li').last()).toBeInViewport();
    expect(await scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath(`download-full-review-${language}.png`), scale: 'css' });
    await scrollBody.evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.getByTestId('dataset.downloads.create.format').selectOption('incremental_stream');
    await page.getByTestId('dataset.downloads.create.from_snapshot').selectOption('200');
    await page.getByTestId('dataset.downloads.create.send_mail').uncheck();
    await page.screenshot({ path: testInfo.outputPath(`download-incremental-source-${language}.png`), scale: 'css' });
    await scrollBody.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(review.locator('li').last()).toBeInViewport();
    expect(await scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath(`download-incremental-review-${language}.png`), scale: 'css' });

    const reqPromise = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes('/api/v7.0/snapshot_downloads')
    );
    await page.getByTestId('dataset.downloads.create.submit').click();

    expect((await reqPromise).postDataJSON()).toEqual({
      snapshot_download: {
        snapshot: 201,
        from_snapshot: 200,
        format: 'incremental_stream',
        send_mail: false,
      },
    });
    await expect(page.getByTestId('modal.action_progress')).toBeVisible();
    await expect(page.getByTestId('modal.action_progress')).toContainText('#702');
    await page.getByTestId('modal.action_progress.continue').click();
    await expect(page.getByTestId(itemPrefix)).toContainText(language === 'cs' ? 'Od base' : 'From base');
    await expect(page.getByTestId(itemPrefix)).toContainText('2099');
  });

  test("shows reliable ready, pending, expired and failed download states", async ({
    page,
  }) => {
    const item601 = downloadItemPrefix(page, 601);
    const item602 = downloadItemPrefix(page, 602);
    const item603 = downloadItemPrefix(page, 603);
    const item604 = downloadItemPrefix(page, 604);
    const item605 = downloadItemPrefix(page, 605);

    await bootstrapVpsAdminWindow(page, {
      sessionToken: "TEST",
    });

    await installHaveApiMock(page, {
      user: { id: 1, login: "admin", level: 99 },
      handlers: {
        "GET datasets/10": () => ({ dataset: {
          id: 10,
          full_name: "tank/vps/ds10",
          name: "ds10",
          used: 2048,
          refquota: 10240,
          snapshots_count: 4,
          mount_count: 0,
          export_count: 0,
          object_state: "active",
          vps: { id: 300, hostname: "alpha.example" },
        } }),

        "GET snapshot_downloads": () => ({
          snapshot_downloads: [
            {
              id: 601,
              dataset: 10,
              snapshot: { id: 200, label: "snap-ready-url" },
              format: "archive",
              download_url: "/generated/601.tar.gz",
              file_name: "generated-601.tar.gz",
              size: 128,
              expires_at: "2099-02-10T00:00:00.000Z",
            },
            {
              id: 602,
              dataset: 10,
              snapshot: { id: 201, label: "snap-pending" },
              format: "stream",
              ready: false,
              file_name: "pending-602.zfs",
              expires_at: "2099-02-10T00:00:00.000Z",
            },
            {
              id: 603,
              dataset: 10,
              snapshot: { id: 202, label: "snap-expired" },
              format: "archive",
              ready: true,
              url: "https://example.test/expired-603.tar.gz",
              file_name: "expired-603.tar.gz",
              expires_at: "2000-01-01T00:00:00.000Z",
            },
            {
              id: 604,
              dataset: 10,
              snapshot: { id: 203, label: "snap-failed" },
              format: "archive",
              state: "failed",
              error_message: "zfs send failed",
              file_name: "failed-604.tar.gz",
            },
            {
              id: 605,
              dataset: 10,
              snapshot: { id: 204, label: "snap-legacy" },
              format: "archive",
              ready: true,
              file_name: "legacy-605.tar.gz",
              expires_at: "2099-02-10T00:00:00.000Z",
            },
          ],
        }),
      },
    });

    await page.goto("/app/datasets/10/downloads");

    await expect(page.getByTestId(item601)).toContainText(
      "Ready",
    );
    await expect(
      page.getByTestId(`${item601}.download`),
    ).toHaveAttribute("href", /generated\/601\.tar\.gz/);
    await expect(
      page.getByTestId(`${item601}.copy_link`),
    ).toBeVisible();

    await expect(page.getByTestId(item602)).toContainText(
      "Pending",
    );
    await expect(
      page.getByTestId(`${item602}.download`),
    ).toBeDisabled();
    await expect(
      page.getByTestId(`${item602}.copy_link`),
    ).toHaveCount(0);

    await expect(page.getByTestId(item603)).toContainText(
      "Expired",
    );
    await expect(
      page.getByTestId(`${item603}.download`),
    ).toBeDisabled();
    await expect(
      page.getByTestId(`${item603}.retry`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`${item603}.copy_link`),
    ).toHaveCount(0);

    await expect(page.getByTestId(item604)).toContainText(
      "Failed",
    );
    await expect(
      page.getByTestId(`${item604}.status_detail`),
    ).toContainText("zfs send failed");
    await expect(
      page.getByTestId(`${item604}.retry`),
    ).toBeVisible();

    await expect(page.getByTestId(item605)).toContainText(
      "Ready",
    );
    await expect(
      page.getByTestId(`${item605}.download`),
    ).toHaveAttribute("href", /page=backup&action=download_link&id=605/);
  });

  test("delete download uses a confirm dialog and removes the row", async ({
    page,
  }) => {
    const itemPrefix = downloadItemPrefix(page, 501);
    let deleted = false;
    let deleteCalls = 0;

    await bootstrapVpsAdminWindow(page, {
      sessionToken: "TEST",
    });

    await installHaveApiMock(page, {
      user: { id: 1, login: "admin", level: 99 },
      handlers: {
        "GET datasets/10": () => ({ dataset: {
          id: 10,
          full_name: "tank/vps/ds10",
          name: "ds10",
          used: 2048,
          refquota: 10240,
          snapshots_count: 1,
          mount_count: 0,
          export_count: 0,
          object_state: "active",
          vps: { id: 300, hostname: "alpha.example" },
        } }),

        "GET snapshot_downloads": () => {
          if (deleted) {
            return { snapshot_downloads: [] };
          }
          return {
            snapshot_downloads: [
              {
                id: 501,
                dataset: 10,
                snapshot: { id: 200, label: "snap-200" },
                format: "archive",
                ready: true,
                url: "https://example.test/dl.tar.gz",
                file_name: "dl.tar.gz",
                size: 128,
                sha256: "a".repeat(64),
                expires_at: "2099-12-10T00:00:00.000Z",
              },
            ],
          };
        },

        "DELETE snapshot_downloads/501": () => {
          deleteCalls += 1;
          deleted = true;
          return { snapshot_download: {} };
        },
      },
    });

    await page.goto("/admin/datasets/10/downloads");

    await expect(page.getByTestId("dataset.downloads.list")).toBeVisible();
    await expect(page.getByTestId(itemPrefix)).toBeVisible();

    await page.getByTestId(`${itemPrefix}.delete`).click();
    await expect(
      page.getByTestId("dataset.downloads.delete_confirm"),
    ).toBeVisible();
    await expect(
      page.getByTestId("dataset.downloads.delete_confirm.confirm"),
    ).toBeEnabled();
    await expect(
      page.getByTestId("dataset.downloads.delete_confirm").locator("input"),
    ).toHaveCount(0);

    const proofScreenshot = process.env["E2E_PROOF_SCREENSHOT"]?.trim();
    if (proofScreenshot) {
      await page.screenshot({ path: proofScreenshot, fullPage: true });
    }

    await page.getByTestId("dataset.downloads.delete_confirm.confirm").click();
    await expect(
      page.getByTestId("dataset.downloads.delete_confirm"),
    ).toBeHidden();

    await expect(page.getByTestId(itemPrefix)).toHaveCount(0);
    expect(deleteCalls).toBe(1);
  });

  test("@pr-smoke @pr-smoke-mobile @smoke-mobile normal users can download and delete their own ready backups", async ({
    page,
  }) => {
    const itemPrefix = downloadItemPrefix(page, 501);
    let deleted = false;
    let deleteCalls = 0;

    await bootstrapVpsAdminWindow(page, {
      sessionToken: "TEST",
    });

    await installHaveApiMock(page, {
      user: { id: 2, login: "member", level: 1 },
      handlers: {
        "GET datasets/10": () => ({ dataset: {
          id: 10,
          full_name: "tank/vps/ds10",
          name: "ds10",
          used: 2048,
          refquota: 10240,
          snapshots_count: 1,
          mount_count: 0,
          export_count: 1,
          object_state: "active",
          vps: { id: 300, hostname: "alpha.example" },
        } }),

        "GET snapshot_downloads": () => ({
          snapshot_downloads: deleted
            ? []
            : [
                {
                  id: 501,
                  user: { id: 2, login: "member" },
                  dataset: 10,
                  snapshot: { id: 200, label: "snap-200" },
                  format: "archive",
                  ready: true,
                  url: "https://example.test/dl.tar.gz",
                  file_name: "dl.tar.gz",
                  size: 128,
                  sha256: "a".repeat(64),
                  expires_at: "2099-12-10T00:00:00.000Z",
                },
              ],
        }),
        "DELETE snapshot_downloads/501": () => {
          deleteCalls += 1;
          deleted = true;
          return { snapshot_download: {} };
        },
      },
    });

    await page.goto("/app/datasets/10/downloads");

    await expect(page.getByTestId(itemPrefix)).toBeVisible();
    await expect(
      page.getByTestId(`${itemPrefix}.download`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`${itemPrefix}.download`),
    ).toHaveAttribute("href", "https://example.test/dl.tar.gz");
    await page.getByTestId(`${itemPrefix}.delete`).click();
    await expect(
      page.getByTestId("dataset.downloads.delete_confirm.confirm"),
    ).toBeEnabled();
    await page.getByTestId("dataset.downloads.delete_confirm.confirm").click();
    await expect(page.getByTestId(itemPrefix)).toHaveCount(0);
    expect(deleteCalls).toBe(1);
  });
  test("shows pending, expired and failed download artifacts without exposing stale links", async ({
    page,
  }) => {
    const item601 = downloadItemPrefix(page, 601);
    const item602 = downloadItemPrefix(page, 602);
    const item603 = downloadItemPrefix(page, 603);

    await bootstrapVpsAdminWindow(page, {
      sessionToken: "TEST",
    });

    await installHaveApiMock(page, {
      user: { id: 1, login: "admin", level: 99 },
      handlers: {
        "GET datasets/10": () => ({ dataset: {
          id: 10,
          full_name: "tank/vps/ds10",
          name: "ds10",
          used: 2048,
          refquota: 10240,
          snapshots_count: 2,
          mount_count: 0,
          export_count: 0,
          object_state: "active",
          vps: { id: 300, hostname: "alpha.example" },
        } }),
        "GET datasets/10/snapshots": () => ({
          snapshots: [
            {
              id: 200,
              dataset: { id: 10 },
              name: "snap-200",
              label: "snap-200",
              created_at: "2026-01-26T00:00:00.000Z",
            },
            {
              id: 201,
              dataset: { id: 10 },
              name: "snap-201",
              label: "snap-201",
              created_at: "2099-01-27T00:00:00.000Z",
            },
          ],
        }),
        "GET snapshot_downloads": () => ({
          snapshot_downloads: [
            {
              id: 601,
              dataset: 10,
              snapshot: { id: 200, label: "snap-200" },
              format: "archive",
              ready: false,
              url: "https://example.test/pending.tar.gz",
              file_name: "pending.tar.gz",
              expires_at: "2099-12-01T00:00:00.000Z",
            },
            {
              id: 602,
              dataset: 10,
              snapshot: { id: 200, label: "snap-200" },
              format: "archive",
              ready: true,
              url: "https://example.test/expired.tar.gz",
              file_name: "expired.tar.gz",
              expires_at: "2026-01-01T00:00:00.000Z",
            },
            {
              id: 603,
              dataset: 10,
              snapshot: { id: 201, label: "snap-201" },
              from_snapshot: { id: 200, label: "snap-200" },
              format: "incremental_stream",
              state: "failed",
              error_message: "zfs send failed",
              file_name: "failed.zfs",
            },
          ],
        }),
      },
    });

    await page.goto("/app/datasets/10/downloads");

    await expect(page.getByTestId(item601)).toContainText(
      "Pending",
    );
    await expect(
      page.getByTestId(`${item601}.status_detail`),
    ).toContainText("Preparation is still running");
    await expect(
      page.getByTestId(`${item601}.download`),
    ).toBeDisabled();
    await expect(
      page.getByTestId(`${item601}.copy_link`),
    ).toHaveCount(0);

    await expect(page.getByTestId(item602)).toContainText(
      "Expired",
    );
    await expect(
      page.getByTestId(`${item602}.download`),
    ).toBeDisabled();
    await expect(
      page.getByTestId(`${item602}.copy_link`),
    ).toHaveCount(0);
    await expect(
      page.getByTestId(`${item602}.retry`),
    ).toBeVisible();

    await expect(page.getByTestId(item603)).toContainText(
      "Failed",
    );
    await expect(
      page.getByTestId(`${item603}.status_detail`),
    ).toContainText("zfs send failed");
    await expect(
      page.getByTestId(`${item603}.download`),
    ).toBeDisabled();
    await expect(
      page.getByTestId(`${item603}.copy_link`),
    ).toHaveCount(0);

    await page.getByTestId(`${item603}.retry`).click();
    await expect(
      page.getByTestId("dataset.downloads.create.modal"),
    ).toBeVisible();
    await expect(
      page.getByTestId("dataset.downloads.create.snapshot"),
    ).toHaveValue("201");
    await expect(
      page.getByTestId("dataset.downloads.create.format"),
    ).toHaveValue("incremental_stream");
    await expect(
      page.getByTestId("dataset.downloads.create.from_snapshot"),
    ).toHaveValue("200");
  });
});
