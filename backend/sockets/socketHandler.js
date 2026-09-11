import jwt from "jsonwebtoken";
import User from "../models/User.js";

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

      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select("_id");
      if (!user) return next(new Error("Unauthorized"));

      socket.userId = user._id.toString();
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on("disconnect", () => {
      // Socket.IO leaves rooms automatically on disconnect — nothing else to clean up.
    });
  });
};

// Lets notification.service.js emit without a circular import back to server.js.
// This is also the seam a Redis adapter (io.adapter(...)) would attach to later.
export const getIO = () => ioInstance;
