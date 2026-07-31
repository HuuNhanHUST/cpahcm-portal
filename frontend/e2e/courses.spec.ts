import { test, expect } from "@playwright/test";

const API = "http://localhost:3001/api/v1";
const ADMIN = { email: "testadmin@cpahcm.vn", password: "TestPass123!" };
const MEMBER = { email: "testuser_audit@example.com", password: "TestPass123!" };
const BUSINESS = { email: "testbusiness@example.com", password: "TestPass123!" };

// Chỉ đăng nhập MỘT LẦN cho mỗi role trong toàn bộ file (backend giới hạn 10 login/60s) —
// mọi test dùng lại cùng token thay vì login() riêng lẻ nhiều lần.
let adminAuth: any, memberAuth: any, businessAuth: any;

test.beforeAll(async ({ request }) => {
  const [a, m, b] = await Promise.all([
    request.post(`${API}/auth/login`, { data: ADMIN }).then((r) => r.json()),
    request.post(`${API}/auth/login`, { data: MEMBER }).then((r) => r.json()),
    request.post(`${API}/auth/login`, { data: BUSINESS }).then((r) => r.json()),
  ]);
  adminAuth = a.data;
  memberAuth = m.data;
  businessAuth = b.data;
});

async function seedAuth(page: any, auth: any) {
  await page.addInitScript((d: any) => {
    localStorage.setItem("accessToken", d.accessToken);
    localStorage.setItem("refreshToken", d.refreshToken);
    localStorage.setItem("user", JSON.stringify(d.user));
    localStorage.setItem("token", d.accessToken);
  }, auth);
}

async function createCourseDirect(request: any, overrides: Record<string, string> = {}) {
  const res = await request.post(`${API}/admin/courses`, {
    headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
    multipart: {
      title: `E2E Course ${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category: "CPA",
      price: "1000000",
      modules: JSON.stringify([
        { title: "Module 1: Nhập môn", lessons: [{ title: "Bài 1" }, { title: "Bài 2" }] },
        { title: "Module 2: Thực hành", lessons: [{ title: "Bài 3" }] },
      ]),
      ...overrides,
    },
  });
  const json = await res.json();
  return json.data;
}

// LƯU Ý: courses.service.ts deleteCourse() chặn xóa CỨNG bất kỳ khóa học nào từng có enrollment —
// kể cả enrollment đã CANCELLED (đúng chủ đích, giữ lịch sử ghi danh) — nên gọi DELETE ở đây LUÔN
// LUÔN 409, dù trước đó có hủy hết enrollment hay không. Trước đây hàm này gọi DELETE mà không
// kiểm tra kết quả, khiến hàng chục khóa học rác "E2E Course/Delete Guard" bị bỏ lại VÀ HIỂN THỊ
// active=true trong Admin thật (phát hiện qua báo cáo người dùng). Giờ chỉ hủy enrollment rồi ẩn
// khóa học (isActive=false) — khớp đúng gợi ý lỗi của chính backend ("Vui lòng ẩn khóa học thay vì xóa").
async function cancelEnrollmentsAndDelete(request: any, courseId: string) {
  const res = await request.get(`${API}/admin/enrollments`, { headers: { Authorization: `Bearer ${adminAuth.accessToken}` } });
  const json = await res.json();
  const mine = (json.data || []).filter((e: any) => e.course?.id === courseId);
  for (const e of mine) {
    await request.patch(`${API}/admin/enrollments/${e.id}/status`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}`, "Content-Type": "application/json" },
      data: { status: "CANCELLED" },
    });
  }
  await request.put(`${API}/admin/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
    multipart: { isActive: "false" },
  });
}

test.describe("Admin — Course validation rules", () => {
  test("originalPrice <= price bị chặn với thông báo lỗi rõ ràng", async ({ request }) => {
    const res = await request.post(`${API}/admin/courses`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
      multipart: {
        title: `E2E Invalid Price ${Date.now()}`,
        category: "CPA",
        price: "1000000",
        originalPrice: "900000",
      },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    const messages = JSON.stringify(json.errors || json.message);
    expect(messages).toContain("lớn hơn học phí");
  });

  test("category không nằm trong danh sách cố định bị chặn", async ({ request }) => {
    const res = await request.post(`${API}/admin/courses`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
      multipart: { title: `E2E Bad Category ${Date.now()}`, category: "Ngoại ngữ", price: "500000" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Course detail + enrollment flow", () => {
  let courseId: string;
  let courseSlug: string;

  test.beforeAll(async ({ request }) => {
    const course = await createCourseDirect(request);
    courseId = course.id;
    courseSlug = course.slug;
  });

  test.afterAll(async ({ request }) => {
    await cancelEnrollmentsAndDelete(request, courseId);
  });

  test("trang chi tiết hiển thị đúng giáo trình (module + lesson) theo thứ tự", async ({ page }) => {
    await page.goto(`/dao-tao/${courseSlug}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Module 1: Nhập môn")).toBeVisible();
    await expect(page.locator("text=Bài 1")).toBeVisible();
  });

  test("chưa đăng nhập — click Đăng Ký thấy AuthGateNotice, không gọi API enroll", async ({ page }) => {
    let enrollCalled = false;
    page.on("request", (req) => {
      if (req.url().includes("/enroll")) enrollCalled = true;
    });
    await page.goto(`/dao-tao/${courseSlug}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=/Cần đăng nhập/i")).toBeVisible();
    expect(enrollCalled).toBe(false);
  });

  test("đăng nhập role BUSINESS (sai role) — vẫn bị chặn giống chưa đăng nhập", async ({ page }) => {
    await seedAuth(page, businessAuth);
    await page.goto(`/dao-tao/${courseSlug}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=/Cần đăng nhập/i")).toBeVisible();
  });

  test("đăng nhập MEMBER — đăng ký thành công, gọi lại lần 2 bị chặn (không tạo enrollment thứ 2)", async ({ page }) => {
    await seedAuth(page, memberAuth);
    await page.goto(`/dao-tao/${courseSlug}`);
    await page.waitForLoadState("networkidle");

    await page.locator("button", { hasText: "Đăng Ký Khóa Học" }).click();
    await expect(page.locator("text=/Đăng ký thành công/i")).toBeVisible({ timeout: 5000 });

    const res2 = await page.request.post(`${API}/courses/${courseId}/enroll`, {
      headers: { Authorization: `Bearer ${memberAuth.accessToken}` },
    });
    expect(res2.status()).toBe(409);

    const listRes = await page.request.get(`${API}/admin/enrollments`, { headers: { Authorization: `Bearer ${adminAuth.accessToken}` } });
    const listJson = await listRes.json();
    const mine = (listJson.data || []).filter((e: any) => e.course?.id === courseId && e.user?.email === MEMBER.email);
    expect(mine.length).toBe(1);
  });
});

test.describe("Xóa course đang có enrollment — phải bị chặn", () => {
  test("không cho xóa cứng khi đã có học viên đăng ký", async ({ request }) => {
    const course = await createCourseDirect(request, { title: `E2E Delete Guard ${Date.now()}` });

    await request.post(`${API}/courses/${course.id}/enroll`, {
      headers: { Authorization: `Bearer ${memberAuth.accessToken}` },
    });

    const delRes = await request.delete(`${API}/admin/courses/${course.id}`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
    });
    expect(delRes.status()).toBe(409);

    await cancelEnrollmentsAndDelete(request, course.id);
  });
});
