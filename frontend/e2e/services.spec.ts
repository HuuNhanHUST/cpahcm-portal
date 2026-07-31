import { test, expect } from "@playwright/test";

const API = "http://localhost:3001/api/v1";
const ADMIN_EMAIL = "testadmin@cpahcm.vn";
const ADMIN_PASSWORD = "TestPass123!";

// Backend giới hạn tần suất /auth/login (10 req/60s, xem throttleConfig) — chỉ đăng nhập MỘT
// LẦN cho toàn bộ file test này (test.beforeAll), mọi test dùng lại cùng 1 token, thay vì gọi
// login() riêng ở từng test (dễ dồn quá giới hạn và gây lỗi 429 giả — không phải lỗi app thật).
let adminAuth: any;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const json = await res.json();
  adminAuth = json.data;
});

async function seedAuth(page: any, auth: any) {
  await page.addInitScript((d: any) => {
    localStorage.setItem("accessToken", d.accessToken);
    localStorage.setItem("refreshToken", d.refreshToken);
    localStorage.setItem("user", JSON.stringify(d.user));
    localStorage.setItem("token", d.accessToken);
  }, auth);
}

const createdServiceIds: string[] = [];

test.afterAll(async ({ request }) => {
  for (const id of createdServiceIds) {
    await request.delete(`${API}/admin/services/${id}`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
    }).catch(() => {});
  }
});

test.describe("/dich-vu — public catalog", () => {
  test("danh sách hiển thị đúng dữ liệu thật từ API (không phải mock cứng)", async ({ page, request }) => {
    const res = await request.get(`${API}/services`);
    const json = await res.json();
    await page.goto("/dich-vu");
    await page.waitForLoadState("networkidle");
    const cards = page.locator('a[href^="/dich-vu/"]');
    expect(await cards.count()).toBe(json.data.length);
  });
});

test.describe("Admin — Service CRUD end-to-end", () => {
  test("tạo dịch vụ mới có ảnh + rich text + features/deliverables, hiển thị đúng ở public", async ({ page }) => {
    await seedAuth(page, adminAuth);

    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await page.locator("button", { hasText: "Quản lý Dịch vụ" }).first().click();
    await page.locator("button", { hasText: "Thêm Dịch Vụ Mới" }).first().click();

    const uniqueTitle = `E2E Test Service ${Date.now()}`;
    await page.locator('input[placeholder="Dịch vụ Kế toán Trọn gói"]').fill(uniqueTitle);
    await page.locator("textarea").first().fill("Mô tả ngắn đủ dài cho dịch vụ test E2E Playwright.");

    const editor = page.locator(".prose-cpa[contenteditable=true]");
    await editor.click();
    await editor.type("Nội dung rich text test.");
    await page.keyboard.down("Control");
    await page.keyboard.press("b");
    await page.keyboard.up("Control");
    await editor.type(" chữ đậm.");

    const featureInputs = page.locator('input[placeholder="VD: Thiết lập sổ sách kế toán"]');
    await featureInputs.first().fill("Feature test 1 đủ dài");
    await page.locator("button", { hasText: "+ Thêm dòng" }).first().click();
    await featureInputs.nth(1).fill("Feature test 2 đủ dài");

    const deliverableInputs = page.locator('input[placeholder="VD: Báo cáo tài chính cuối năm"]');
    await deliverableInputs.first().fill("Deliverable test đủ dài");

    let capturedPayload: any = null;
    page.on("request", (req) => {
      if (req.url().includes("/admin/services") && req.method() === "POST") {
        capturedPayload = req.postData();
      }
    });

    await page.locator('button[type="submit"]', { hasText: "Thêm Dịch Vụ" }).click();
    await page.waitForTimeout(1500);

    expect(capturedPayload).toBeTruthy();

    const listRes = await page.request.get(`${API}/admin/services`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
    });
    const listJson = await listRes.json();
    const created = listJson.data.find((s: any) => s.title === uniqueTitle);
    expect(created).toBeTruthy();
    createdServiceIds.push(created.id);
    expect(created.features.length).toBe(2);
    expect(created.deliverables.length).toBe(1);
    expect(created.longDescription).toContain("<strong>");

    await page.goto(`/dich-vu/${created.slug}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText(uniqueTitle);
    await expect(page.locator("text=Feature test 1 đủ dài")).toBeVisible();
    await expect(page.locator("text=Deliverable test đủ dài")).toBeVisible();
  });

  test("XSS qua Rich Text bị chặn — <script> không xuất hiện ở DOM trang public", async ({ page }) => {
    const uniqueTitle = `E2E XSS Test ${Date.now()}`;

    const res = await page.request.post(`${API}/admin/services`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
      multipart: {
        title: uniqueTitle,
        category: "Kế toán",
        shortDesc: "Mô tả ngắn đủ dài để test XSS sanitize backend.",
        longDescription: '<p>OK</p><script>window.__xss_fired = true;</script>',
        features: JSON.stringify(["Feature đủ dài để hợp lệ"]),
        deliverables: JSON.stringify(["Deliverable đủ dài để hợp lệ"]),
      },
    });
    const json = await res.json();
    const created = json.data;
    createdServiceIds.push(created.id);
    expect(created.longDescription).not.toContain("<script>");

    await page.goto(`/dich-vu/${created.slug}`);
    await page.waitForLoadState("networkidle");
    const xssFired = await page.evaluate(() => (window as any).__xss_fired);
    expect(xssFired).toBeUndefined();
    const html = await page.content();
    expect(html).not.toContain("<script>window.__xss_fired");
  });
});
