import api, { refreshAccessToken } from "./axios.js";

// Signup = "claim your account": only { email }; the server emails an activation link.
export const signupApi = (data) => api.post("/auth/signup", data);
// { token, password } — the token comes from the activation link's URL fragment.
export const verifyEmailApi = (data) => api.post("/auth/verify-email", data);
export const loginApi = (data) => api.post("/auth/login", data);
export const logoutApi = () => api.post("/auth/logout");
export const getMeApi = () => api.get("/auth/me");
export const refreshTokenApi = () => refreshAccessToken(); // shared single-flight refresh
export const getProfile = () => api.get("/auth/profile");
export const updateProfile = (data) => api.patch("/auth/profile", data);
// { currentPassword, newPassword } — ends every session, this one included.
export const changePasswordApi = (data) => api.patch("/auth/password", data);
// { email } — the server answers every address with the same message.
export const forgotPasswordApi = (data) =>
  api.post("/auth/forgot-password", data);
// { token, password } — the token comes from the reset link's URL fragment.
export const resetPasswordApi = (data) =>
  api.post("/auth/reset-password", data);
