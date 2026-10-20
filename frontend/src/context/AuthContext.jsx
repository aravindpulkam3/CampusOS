import { createContext, useState, useEffect, useCallback } from "react";
import { getMeApi, logoutApi } from "../api/auth.api.js";
import { refreshAccessToken } from "../api/axios.js";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until initial /me check is done

  const fetchUser = useCallback(async () => {
    try {
      const res = await getMeApi();
      setUser(res.data.data);
    } catch (err) {
      // /auth/me is left out of the interceptor's refresh-and-retry, so a tab
      // opened after the access token lapsed would read as signed out although
      // the refresh cookie is still good. Renew once through the shared
      // single-flight and ask again; if that fails there is no session.
      let restored = null;
      if (err.response?.status === 401) {
        try {
          await refreshAccessToken();
          restored = (await getMeApi()).data.data;
        } catch {
          restored = null;
        }
      }
      setUser(restored);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

