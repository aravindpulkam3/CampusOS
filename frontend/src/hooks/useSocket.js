import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

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

    return () => {
      instance.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  return socket;
};

export default useSocket;
