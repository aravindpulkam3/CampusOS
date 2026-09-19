import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { refreshAccessToken } from "../api/axios";

// Socket.IO connects to the server's ORIGIN, not the /api-prefixed REST base.
// A relative VITE_API_URL (production: "/api", frontend and API behind the
// same reverse proxy) means "this origin", so the client deliberately uses the
// current page's origin (io() with no URL). An absolute one (local dev
// default) gives its origin explicitly.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL = API_URL.startsWith("/") ? undefined : new URL(API_URL).origin;

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

    const options = { withCredentials: true };
    const instance = SOCKET_URL ? io(SOCKET_URL, options) : io(options);
    socketRef.current = instance;
    setSocket(instance);

    // The handshake rejects an expired access token with "Unauthorized", and
    // Socket.IO never retries a middleware rejection by itself. Refresh through
    // the shared single-flight (never a direct /auth/refresh call, which could
    // race REST 401s into refresh-token reuse) and reconnect — once per failure
    // cycle. If the refresh fails, the REST 401 flow handles logout.
    let disposed = false;
    let refreshAttempted = false;
    const refreshAndReconnect = () => {
      if (refreshAttempted) return;
      refreshAttempted = true;
      refreshAccessToken()
        .then(() => {
          if (!disposed) instance.connect();
        })
        .catch(() => {});
    };
    instance.on("connect", () => {
      refreshAttempted = false;
    });
    instance.on("connect_error", (err) => {
      if (err.message === "Unauthorized") refreshAndReconnect();
    });
    // The server disconnects a socket when the access token it was authorised
    // with expires (and on logout-all). Socket.IO never auto-reconnects a
    // server-side disconnect, so refresh and reconnect the same way.
    instance.on("disconnect", (reason) => {
      if (reason === "io server disconnect") refreshAndReconnect();
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
