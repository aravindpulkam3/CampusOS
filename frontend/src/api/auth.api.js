import api, { refreshAccessToken } from "./axios.js";

// Signup = "claim your account": only { email }; the server emails an activation link.
export const signupApi = (data) => api.post("/auth/signup", data);
// { token, password } — the token comes from the activation link's URL fragment.
export const verifyEmailApi = (data) => api.post("/auth/verify-email", data);
export const loginApi = (data) => api.post("/auth/login", data);
export const logoutApi = () => api.post("/auth/logout");
export const getMeApi = () => api.get("/auth/me");
export const refreshTokenApi = () => refreshAccessToken(); // shared single-flight refresh
export const getProfile=()=>api.get("/auth/profile");
export const updateProfile=(data)=>api.patch("/auth/profile",data);