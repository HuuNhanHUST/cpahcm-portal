import { API_BASE } from "./config";

function readToken(key: string): { value: string | null; store: Storage | null } {
  if (typeof window === "undefined") return { value: null, store: null };
  const local = localStorage.getItem(key);
  if (local) return { value: local, store: localStorage };
  const session = sessionStorage.getItem(key);
  if (session) return { value: session, store: sessionStorage };
  return { value: null, store: null };
}

function clearSession() {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem("accessToken");
    store.removeItem("refreshToken");
    store.removeItem("user");
    store.removeItem("token");
  }
}

// Backend xoay vòng refresh token (rotation) + phát hiện tái sử dụng: dùng 1 refresh token đã bị
// xoay vòng sẽ bị coi là "token bị đánh cắp" và thu hồi TOÀN BỘ session của user. Nếu 2 lời gọi
// authFetch cùng gặp 401 gần như đồng thời (vd. ChatWidget nạp lịch sử + Header lưu hồ sơ), mỗi
// lời gọi tự refresh riêng sẽ khiến lời gọi thứ 2 dùng refresh token vừa bị xoay bởi lời gọi thứ
// nhất — kích hoạt nhầm cơ chế phát hiện đánh cắp, đăng xuất người dùng dù họ không làm gì sai.
// Dùng 1 promise refresh dùng chung cho mọi lời gọi đồng thời để chỉ có đúng 1 request refresh
// thật sự được gửi đi.
let inFlightRefresh: Promise<string | null> | null = null;

/** Gọi POST /auth/refresh bằng refreshToken đang lưu, ghi đè accessToken/refreshToken mới vào
 * đúng storage đang dùng. Trả về accessToken mới nếu thành công, null nếu thất bại (phiên đăng
 * nhập đã hết hạn thật — dọn sạch storage để các trang tự phát hiện và điều hướng về /login). */
export async function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const { value: refreshToken, store } = readToken("refreshToken");
    if (!refreshToken || !store) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearSession();
        return null;
      }
      const json = await res.json().catch(() => null);
      const newAccessToken = json?.data?.accessToken;
      const newRefreshToken = json?.data?.refreshToken;
      if (!newAccessToken) {
        clearSession();
        return null;
      }
      store.setItem("accessToken", newAccessToken);
      if (newRefreshToken) store.setItem("refreshToken", newRefreshToken);
      return newAccessToken;
    } catch {
      return null;
    }
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
}

/**
 * fetch() có tự làm mới access token khi hết hạn (401) — access token chỉ sống 15 phút
 * (JWT_ACCESS_EXPIRES_IN), trước đây mọi trang gọi fetch trực tiếp với accessToken đọc 1 lần lúc
 * mount nên bất kỳ hành động nào (trả lời diễn đàn, nộp CV, tải chứng từ...) xảy ra sau 15 phút kể
 * từ lúc đăng nhập/lần refresh gần nhất đều trả về "Unauthorized" dù người dùng vẫn đang đăng
 * nhập — backend đã có sẵn POST /auth/refresh nhưng frontend chưa từng gọi tới.
 *
 * Luôn đọc token MỚI NHẤT từ storage tại thời điểm gọi (không nhận qua tham số/closure có thể đã
 * cũ), tự retry 1 lần bằng access token mới nếu gặp 401; nếu refresh cũng thất bại thì trả về
 * response 401 gốc để nơi gọi tự xử lý (hiện thông báo, điều hướng...).
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { value: accessToken } = readToken("accessToken");

  const doFetch = (token: string | null) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  const res = await doFetch(accessToken);
  if (res.status !== 401) return res;

  const newAccessToken = await refreshAccessToken();
  if (!newAccessToken) return res;

  return doFetch(newAccessToken);
}
