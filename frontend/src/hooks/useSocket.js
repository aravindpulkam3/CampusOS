import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { refreshAccessToken } from "../api/axios";

// Socket.IO connects to the server root, not the /api-prefixed REST base.
const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

const useSocket = (enabled) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!enabled) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    const instance = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = instance;
    setSocket(instance);

    // The handshake rejects an expired access token with "Unauthorized", and
    // Socket.IO never retries a middleware rejection by itself. Refresh through
    // the shared single-flight (never a direct /auth/refresh call, which could
    // race REST 401s into refresh-token reuse) and reconnect — once per failure
    // cycle. If the refresh fails, the REST 401 flow handles logout.
    let disposed = false;
    let refreshAttempted = false;
    instance.on("connect", () => {
      refreshAttempted = false;
    });
    instance.on("connect_error", (err) => {
      if (err.message !== "Unauthorized" || refreshAttempted) return;
      refreshAttempted = true;
      refreshAccessToken()
        .then(() => {
          if (!disposed) instance.connect();
        })
        .catch(() => {});
    });

    return () => {
      disposed = true;
      instance.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  return socket;
};

export default useSocket;
