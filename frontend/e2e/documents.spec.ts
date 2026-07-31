import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

const API = "http://localhost:3001/api/v1";
const ADMIN = { email: "testadmin@cpahcm.vn", password: "TestPass123!" };
const MEMBER = { email: "testuser_audit@example.com", password: "TestPass123!" };
const BUSINESS_A = { email: "testbusiness@example.com", password: "TestPass123!" };
const BUSINESS_B_CREDS = { email: "testbusiness2@example.com", password: "TestPass123!" };
const BUSINESS_B_REGISTER = { ...BUSINESS_B_CREDS, fullName: "E2E Business Hai", role: "BUSINESS" };

// Sinh mã số thuế 10 chữ số duy nhất — LẤY PHẦN CUỐI của Date.now() (không cắt đầu, vì phần
// đầu của timestamp gần như không đổi trong 1 phiên chạy test, dễ đụng trùng taxCode cũ).
const uniqueTaxCode = () => String(Date.now() + Math.floor(Math.random() * 1000)).slice(-10);

let adminAuth: any, memberAuth: any, businessAAuth: any, businessBAuth: any;
let companyAId: string, companyBId: string;
const createdCompanyIds: string[] = [];
const createdDocumentIds: string[] = [];

// File PDF giả tối thiểu hợp lệ để test upload (không cần nội dung thật).
const tmpPdfPath = path.join(os.tmpdir(), `e2e-doc-${Date.now()}.pdf`);

test.beforeAll(async ({ request }) => {
  fs.writeFileSync(tmpPdfPath, "%PDF-1.4\n%%EOF");

  // Tài khoản BUSINESS_B có thể chưa tồn tại — đăng ký trước, bỏ qua nếu đã có sẵn.
  await request.post(`${API}/auth/register`, { data: BUSINESS_B_REGISTER }).catch(() => null);

  const [a, m, ba, bb] = await Promise.all([
    request.post(`${API}/auth/login`, { data: ADMIN }).then((r) => r.json()),
    request.post(`${API}/auth/login`, { data: MEMBER }).then((r) => r.json()),
    request.post(`${API}/auth/login`, { data: BUSINESS_A }).then((r) => r.json()),
    request.post(`${API}/auth/login`, { data: BUSINESS_B_CREDS }).then((r) => r.json()),
  ]);
  adminAuth = a.data;
  memberAuth = m.data;
  businessAAuth = ba.data;
  businessBAuth = bb.data;

  const adminHeaders = { Authorization: `Bearer ${adminAuth.accessToken}`, "Content-Type": "application/json" };

  // Đảm bảo BUSINESS_B thật sự chưa có company — dọn trạng thái sót lại từ lần chạy trước
  // (nếu có) để test "chưa gán công ty" không bị fail giả do dữ liệu cũ còn sót.
  await request.patch(`${API}/admin/users/${businessBAuth.user.id}/company`, { headers: adminHeaders, data: { companyId: null } });

  const companyA = await request
    .post(`${API}/admin/companies`, { headers: adminHeaders, data: { taxCode: uniqueTaxCode(), name: `E2E Company A ${Date.now()}` } })
    .then((r) => r.json());
  companyAId = companyA.data.id;
  createdCompanyIds.push(companyAId);

  await request.patch(`${API}/admin/users/${businessAAuth.user.id}/company`, { headers: adminHeaders, data: { companyId: companyAId } });
  // Cập nhật lại companyId trong object user đã đăng nhập — token/user snapshot được lấy TRƯỚC
  // khi gán company, nếu không cập nhật thì localStorage seed cho page sẽ mang companyId cũ
  // (null), khiến /khach-hang hiện nhầm màn hình "chưa gán công ty".
  businessAAuth.user.companyId = companyAId;
});

test.afterAll(async ({ request }) => {
  const adminHeaders = { Authorization: `Bearer ${adminAuth.accessToken}` };
  for (const id of createdDocumentIds) {
    await request.delete(`${API}/admin/documents/${id}`, { headers: adminHeaders });
  }
  // Gỡ company khỏi user trước khi xóa company (rule chặn xóa nếu còn user liên kết).
  await request.patch(`${API}/admin/users/${businessAAuth.user.id}/company`, {
    headers: { ...adminHeaders, "Content-Type": "application/json" },
    data: { companyId: null },
  });
  await request.patch(`${API}/admin/users/${businessBAuth.user.id}/company`, {
    headers: { ...adminHeaders, "Content-Type": "application/json" },
    data: { companyId: null },
  });
  for (const id of createdCompanyIds) {
    await request.delete(`${API}/admin/companies/${id}`, { headers: adminHeaders });
  }
  fs.unlinkSync(tmpPdfPath);
});

async function seedAuth(page: any, auth: any) {
  await page.addInitScript((d: any) => {
    localStorage.setItem("accessToken", d.accessToken);
    localStorage.setItem("refreshToken", d.refreshToken);
    localStorage.setItem("user", JSON.stringify(d.user));
    localStorage.setItem("token", d.accessToken);
  }, auth);
}

test.describe("RoleGuard — chặn truy cập /khach-hang sai role", () => {
  test("Khách vãng lai (chưa đăng nhập) thấy màn Truy Cập Bị Từ Chối, không thấy form upload", async ({ page }) => {
    await page.goto("/khach-hang");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=/Truy Cập Bị Từ Chối/i")).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  });

  test("MEMBER (sai role) thấy màn Truy Cập Bị Từ Chối — khác với thông báo 'chưa gán công ty'", async ({ page }) => {
    await seedAuth(page, memberAuth);
    await page.goto("/khach-hang");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=/Truy Cập Bị Từ Chối/i")).toBeVisible();
    await expect(page.locator("text=/chưa được gán vào công ty/i")).toHaveCount(0);
  });

  test("BUSINESS đúng role thấy nội dung thật, không bị RoleGuard chặn", async ({ page }) => {
    await seedAuth(page, businessAAuth);
    await page.goto("/khach-hang");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=/Truy Cập Bị Từ Chối/i")).toHaveCount(0);
  });
});

test.describe("Cổng Khách Hàng — chưa được gán công ty", () => {
  test("BUSINESS chưa gán công ty thấy thông báo, không có request upload nào", async ({ page }) => {
    let uploadCalled = false;
    page.on("request", (req) => {
      if (req.url().includes("/documents") && req.method() === "POST") uploadCalled = true;
    });
    await seedAuth(page, businessBAuth);
    await page.goto("/khach-hang");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=/chưa được gán vào công ty/i")).toBeVisible();
    expect(uploadCalled).toBe(false);
  });
});

test.describe("Upload + xem chứng từ (đúng công ty)", () => {
  let uploadedDocId: string;

  test("BUSINESS upload chứng từ qua UI — xuất hiện trong danh sách của công ty mình", async ({ page }) => {
    await seedAuth(page, businessAAuth);
    await page.goto("/khach-hang");
    await page.waitForLoadState("networkidle");

    await page.locator('input[type="file"]').setInputFiles(tmpPdfPath);
    await page.locator("button", { hasText: "Tải Lên" }).click();

    await expect(page.locator(`text=${path.basename(tmpPdfPath)}`)).toBeVisible({ timeout: 8000 });

    const listRes = await page.request.get(`${API}/documents`, { headers: { Authorization: `Bearer ${businessAAuth.accessToken}` } });
    const listJson = await listRes.json();
    const created = (listJson.data || []).find((d: any) => d.fileName === path.basename(tmpPdfPath));
    expect(created).toBeTruthy();
    uploadedDocId = created.id;
    createdDocumentIds.push(uploadedDocId);
  });

  test("BUSINESS công ty khác (chưa gán company) KHÔNG tải được document — 403 (IDOR)", async ({ request }) => {
    // Gán tạm công ty B cho business B để có companyId hợp lệ nhưng khác company A.
    const adminHeaders = { Authorization: `Bearer ${adminAuth.accessToken}`, "Content-Type": "application/json" };
    const companyB = await request
      .post(`${API}/admin/companies`, { headers: adminHeaders, data: { taxCode: uniqueTaxCode(), name: `E2E Company B ${Date.now()}` } })
      .then((r) => r.json());
    companyBId = companyB.data.id;
    createdCompanyIds.push(companyBId);
    await request.patch(`${API}/admin/users/${businessBAuth.user.id}/company`, { headers: adminHeaders, data: { companyId: companyBId } });

    const downloadRes = await request.get(`${API}/documents/${uploadedDocId}/download`, {
      headers: { Authorization: `Bearer ${businessBAuth.accessToken}` },
    });
    expect(downloadRes.status()).toBe(403);

    const listRes = await request.get(`${API}/documents`, { headers: { Authorization: `Bearer ${businessBAuth.accessToken}` } });
    const listJson = await listRes.json();
    expect((listJson.data || []).find((d: any) => d.id === uploadedDocId)).toBeUndefined();
  });

  test("ADMIN tải xuống được document bất kể công ty nào", async ({ request }) => {
    const res = await request.get(`${API}/admin/documents/${uploadedDocId}/download`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
    });
    expect(res.ok()).toBe(true);
  });

  test("Admin từ chối chứng từ thiếu lý do bị chặn — có lý do thì thành công", async ({ request }) => {
    const adminHeaders = { Authorization: `Bearer ${adminAuth.accessToken}`, "Content-Type": "application/json" };
    const missingReasonRes = await request.patch(`${API}/admin/documents/${uploadedDocId}/status`, {
      headers: adminHeaders,
      data: { status: "REJECTED" },
    });
    expect(missingReasonRes.status()).toBe(400);

    const withReasonRes = await request.patch(`${API}/admin/documents/${uploadedDocId}/status`, {
      headers: adminHeaders,
      data: { status: "REJECTED", reviewNote: "File mờ, không đọc được số liệu" },
    });
    expect(withReasonRes.ok()).toBe(true);
  });

  test("Xóa chứng từ khi đã REJECTED (không còn PENDING) bị chặn", async ({ request }) => {
    const res = await request.delete(`${API}/documents/${uploadedDocId}`, {
      headers: { Authorization: `Bearer ${businessAAuth.accessToken}` },
    });
    expect(res.status()).toBe(400);
  });
});
