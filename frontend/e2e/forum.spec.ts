import { test, expect } from "@playwright/test";

const API = "http://localhost:3001/api/v1";
const ADMIN = { email: "testadmin@cpahcm.vn", password: "TestPass123!" };
const MEMBER = { email: "testuser_audit@example.com", password: "TestPass123!" };
const BUSINESS = { email: "testbusiness@example.com", password: "TestPass123!" };

// Chỉ đăng nhập MỘT LẦN cho mỗi role trong toàn bộ file (backend giới hạn 10 login/60s) —
// mọi test dùng lại cùng token thay vì login() riêng lẻ nhiều lần.
let adminAuth: any, memberAuth: any, businessAuth: any;
let categoryId: string;
let categorySlug: string;
const createdTopicIds: string[] = [];

test.beforeAll(async ({ request }) => {
  const [a, m, b] = await Promise.all([
    request.post(`${API}/auth/login`, { data: ADMIN }).then((r) => r.json()),
    request.post(`${API}/auth/login`, { data: MEMBER }).then((r) => r.json()),
    request.post(`${API}/auth/login`, { data: BUSINESS }).then((r) => r.json()),
  ]);
  adminAuth = a.data;
  memberAuth = m.data;
  businessAuth = b.data;

  const catRes = await request.post(`${API}/admin/forum/categories`, {
    headers: { Authorization: `Bearer ${adminAuth.accessToken}`, "Content-Type": "application/json" },
    data: { name: `E2E Category ${Date.now()}`, description: "Danh mục test E2E" },
  });
  const catJson = await catRes.json();
  categoryId = catJson.data.id;
  categorySlug = catJson.data.slug;
});

test.afterAll(async ({ request }) => {
  for (const id of createdTopicIds) {
    await request.delete(`${API}/admin/forum/topics/${id}`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
    });
  }
  await request.delete(`${API}/admin/forum/categories/${categoryId}`, {
    headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
  });
});

async function seedAuth(page: any, auth: any) {
  await page.addInitScript((d: any) => {
    localStorage.setItem("accessToken", d.accessToken);
    localStorage.setItem("refreshToken", d.refreshToken);
    localStorage.setItem("user", JSON.stringify(d.user));
    localStorage.setItem("token", d.accessToken);
  }, auth);
}

async function createTopicDirect(request: any, auth: any, overrides: Record<string, string> = {}) {
  const res = await request.post(`${API}/forum/topics`, {
    headers: { Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json" },
    data: {
      categoryId,
      title: `E2E Topic ${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      content: "Nội dung chủ đề test E2E đủ dài để pass validate.",
      ...overrides,
    },
  });
  const json = await res.json();
  if (json?.data?.id) createdTopicIds.push(json.data.id);
  return json.data;
}

test.describe("Chưa đăng nhập — bị chặn tạo chủ đề", () => {
  test("click Tạo Chủ Đề Mới thấy AuthGateNotice, không gọi API POST /forum/topics", async ({ page }) => {
    let createCalled = false;
    page.on("request", (req) => {
      if (req.url().includes("/forum/topics") && req.method() === "POST") createCalled = true;
    });
    await page.goto("/dien-dan");
    await page.waitForLoadState("networkidle");
    await page.locator("button", { hasText: "Tạo Chủ Đề Mới" }).click();
    await expect(page.locator("text=/Đăng nhập để tham gia/i")).toBeVisible();
    expect(createCalled).toBe(false);
  });
});

test.describe("Tạo chủ đề + trả lời", () => {
  let topicA: any;

  test.beforeAll(async ({ request }) => {
    topicA = await createTopicDirect(request, memberAuth, { title: `E2E Topic Owned By Member ${Date.now()}` });
  });

  test("MEMBER tạo chủ đề mới qua UI — xuất hiện trong danh sách", async ({ page }) => {
    await seedAuth(page, memberAuth);
    await page.goto("/dien-dan");
    await page.waitForLoadState("networkidle");
    await page.locator("button", { hasText: "Tạo Chủ Đề Mới" }).click();

    const modal = page.locator(".fixed.inset-0");
    const uniqueTitle = `E2E UI Topic ${Date.now()}`;
    await modal.locator("select").selectOption(categoryId);
    await modal.locator('input[placeholder*="Nhập tiêu đề"]').fill(uniqueTitle);
    await modal.locator(".ProseMirror").fill("Nội dung chủ đề tạo qua giao diện UI đủ dài.");
    await modal.locator("button", { hasText: "Đăng Chủ Đề" }).click();

    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 8000 });

    // Lưu lại id để dọn dẹp sau khi test xong.
    const listRes = await page.request.get(`${API}/forum/topics?category=${categorySlug}`);
    const listJson = await listRes.json();
    const created = (listJson.data?.items || []).find((t: any) => t.title === uniqueTitle);
    if (created) createdTopicIds.push(created.id);
  });

  test("trả lời chủ đề — xuất hiện ngay trong danh sách reply", async ({ page }) => {
    await seedAuth(page, memberAuth);
    await page.goto(`/dien-dan/${topicA.slug}`);
    await page.waitForLoadState("networkidle");

    const replyText = `E2E Reply ${Date.now()}`;
    await page.locator('textarea[placeholder*="Nhập nội dung trả lời"]').fill(replyText);
    await page.locator("button", { hasText: "Gửi Trả Lời" }).click();
    await expect(page.locator(`text=${replyText}`)).toBeVisible({ timeout: 8000 });
  });

  test("User khác (BUSINESS) không phải tác giả — bị chặn sửa/xóa chủ đề", async ({ request }) => {
    const editRes = await request.patch(`${API}/forum/topics/${topicA.id}`, {
      headers: { Authorization: `Bearer ${businessAuth.accessToken}`, "Content-Type": "application/json" },
      data: { title: "Tiêu đề bị sửa trái phép đủ dài" },
    });
    expect(editRes.status()).toBe(403);

    const deleteRes = await request.delete(`${API}/forum/topics/${topicA.id}`, {
      headers: { Authorization: `Bearer ${businessAuth.accessToken}` },
    });
    expect(deleteRes.status()).toBe(403);
  });
});

test.describe("Admin — Kiểm duyệt", () => {
  let topicToModerate: any;

  test.beforeAll(async ({ request }) => {
    topicToModerate = await createTopicDirect(request, memberAuth, { title: `E2E Moderation Topic ${Date.now()}` });
  });

  test("Ghim chủ đề — lên đầu danh sách (isPinned=true)", async ({ request }) => {
    const res = await request.patch(`${API}/admin/forum/topics/${topicToModerate.id}/pin`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}`, "Content-Type": "application/json" },
      data: { value: true },
    });
    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json.data.isPinned).toBe(true);
  });

  test("Khóa chủ đề — chặn reply mới (trừ ADMIN)", async ({ request }) => {
    const lockRes = await request.patch(`${API}/admin/forum/topics/${topicToModerate.id}/lock`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}`, "Content-Type": "application/json" },
      data: { value: true },
    });
    expect(lockRes.ok()).toBe(true);

    const replyRes = await request.post(`${API}/forum/topics/${topicToModerate.id}/replies`, {
      headers: { Authorization: `Bearer ${memberAuth.accessToken}`, "Content-Type": "application/json" },
      data: { content: "Trả lời khi đã khóa — phải bị chặn." },
    });
    expect(replyRes.status()).toBe(403);

    // ADMIN vẫn trả lời được dù đã khóa.
    const adminReplyRes = await request.post(`${API}/forum/topics/${topicToModerate.id}/replies`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}`, "Content-Type": "application/json" },
      data: { content: "Thông báo từ Admin dù chủ đề đã khóa." },
    });
    expect(adminReplyRes.ok()).toBe(true);
  });

  test("Xóa chủ đề vi phạm", async ({ request }) => {
    const delRes = await request.delete(`${API}/admin/forum/topics/${topicToModerate.id}`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
    });
    expect(delRes.ok()).toBe(true);
    createdTopicIds.splice(createdTopicIds.indexOf(topicToModerate.id), 1);
  });
});

// Đặt CUỐI CÙNG vì throttle chủ đề (5 lần/5 phút) tính chung theo IP cho toàn bộ file —
// các test tạo chủ đề trước đó (beforeAll x2 + UI test) đã dùng 3/5 lượt, còn lại 2 lượt hợp lệ
// trước khi lượt thứ 6 trong cùng cửa sổ 5 phút phải bị chặn 429.
test.describe("Chống spam — rate limit tạo chủ đề", () => {
  test("vượt quá 5 lần tạo chủ đề/5 phút bị chặn 429", async ({ request }) => {
    // 2 lượt còn lại trong hạn mức — phải thành công.
    for (let i = 0; i < 2; i++) {
      const res = await request.post(`${API}/forum/topics`, {
        headers: { Authorization: `Bearer ${memberAuth.accessToken}`, "Content-Type": "application/json" },
        data: { categoryId, title: `E2E Spam Budget ${Date.now()}_${i}`, content: "Nội dung hợp lệ đủ dài." },
      });
      expect(res.ok()).toBe(true);
      const json = await res.json();
      createdTopicIds.push(json.data.id);
    }

    // Lượt thứ 6 trong cùng cửa sổ 5 phút — phải bị 429.
    const overLimitRes = await request.post(`${API}/forum/topics`, {
      headers: { Authorization: `Bearer ${memberAuth.accessToken}`, "Content-Type": "application/json" },
      data: { categoryId, title: `E2E Over Limit ${Date.now()}`, content: "Nội dung hợp lệ đủ dài." },
    });
    expect(overLimitRes.status()).toBe(429);
  });
});
