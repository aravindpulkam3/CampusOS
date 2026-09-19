import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyAccessToken } from "../utils/generateToken.js";

let ioInstance = null;

// Minimal cookie-header parser — we only ever need the accessToken value.
const parseCookie = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

export const initSocket = (io) => {
  ioInstance = io;

  // Socket-transport auth — identical cookie + JWT check authMiddleware.js does for HTTP.
  io.use(async (socket, next) => {
    try {
      const accessToken = parseCookie(
        socket.handshake.headers.cookie,
        "accessToken"
      );
      if (!accessToken) return next(new Error("Unauthorized"));

      const decoded = verifyAccessToken(accessToken);
      const user = await User.findById(decoded.id).select("_id");
      if (!user) return next(new Error("Unauthorized"));

      socket.userId = user._id.toString();
      socket.data.tokenExp = decoded.exp; // seconds; see the expiry timer below
      next();
    } catch (err) {
      // Bad/expired token (TokenExpiredError extends JsonWebTokenError) is an
      // auth failure — the client refreshes and reconnects on "Unauthorized".
      // Anything else (e.g. the DB lookup failing) is ours, not the client's.
      if (err instanceof jwt.JsonWebTokenError) return next(new Error("Unauthorized"));
      console.error("[SOCKET] handshake failed:", err.message);
      next(new Error("Service unavailable"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    // The handshake is the only auth check, so a socket must not outlive the
    // access token it was authorised with (e.g. after logout-all or a revoked
    // session). The client refreshes and reconnects on "io server disconnect".
    // Capped at setTimeout's max delay (~24.8 days).
    const msLeft = Math.min(socket.data.tokenExp * 1000 - Date.now(), 2 ** 31 - 1);
    const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, msLeft));

    socket.on("disconnect", () => {
      // Socket.IO leaves rooms automatically on disconnect.
      clearTimeout(expiryTimer);
    });
  });
};

// Lets notification.service.js emit without a circular import back to server.js.
// This is also the seam a Redis adapter (io.adapter(...)) would attach to later.
export const getIO = () => ioInstance;
