import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // sends HttpOnly cookies automatically in every request
});

// Routes that should never trigger a silent refresh attempt
const AUTH_ROUTES = [
  "/auth/refresh",
  "/auth/me",
  "/auth/login",
  "/auth/signup",
];

// The single owner of token refresh — nothing else may POST /auth/refresh.
// The server rotates refresh tokens strictly: presenting a token that was
// already rotated counts as reuse and revokes the whole session. So two
// refreshes carrying the SAME token must never be in flight at once:
//  - within a tab, concurrent callers (parallel 401s, useSocket's reconnect)
//    share one in-flight request;
//  - across tabs, the Web Lock serializes refreshes. A waiting tab only sends
//    its refresh after the previous holder's response (and its Set-Cookie) has
//    landed in the shared cookie jar, so it always presents the current token.
// A waiting tab may still do one redundant, valid rotation — correctness does
// not depend on exactly one refresh happening across tabs.
const REFRESH_LOCK = "campusos:auth-refresh";
const withRefreshLock = (fn) =>
  navigator.locks?.request ? navigator.locks.request(REFRESH_LOCK, fn) : fn();

let refreshPromise = null;
export const refreshAccessToken = () => {
  refreshPromise ??= withRefreshLock(() => api.post("/auth/refresh")).finally(
    () => {
      refreshPromise = null;
    },
  );
  return refreshPromise;
};

// Response interceptor — on 401, attempt one silent token refresh then retry
api.interceptors.response.use(
  (response) => response, // ← success path: do nothing, just return
  async (error) => {
    // ← failure path: runs on every error response
    const originalRequest = error.config;
    // error.config contains everything about the failed request
    // method, url, headers, data — everything needed to retry it
    if (!originalRequest) return Promise.reject(error); // not a request/response error

    const isAuthRoute = AUTH_ROUTES.some((route) =>
      originalRequest.url?.includes(route),
    );

    if (
      error.response?.status === 401 && // only care about auth failures
      !originalRequest._retry && // haven't retried yet (prevents loop)
      !isAuthRoute // not an auth route itself
    ) {
      originalRequest._retry = true;
      // ↑ stamps the request so if it fails again with 401
      //   the condition above fails and we don't retry infinitely

      try {
        await refreshAccessToken();
        return api(originalRequest);
      } catch {
        // Refresh failed — just reject, let the caller handle it
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
