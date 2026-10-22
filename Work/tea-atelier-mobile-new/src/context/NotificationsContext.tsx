import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { API_URL } from "../config/api";
import { ensureOk, fetchApi, requestError } from "../config/request";
import { useAuth } from "./AuthContext";

type Notification = {
  notification_id: string;
  order_id: number | null;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
};
type Snapshot = {
  token: string | null;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  saving: boolean;
  loadError: string;
  actionError: string;
};
const empty = (token: string | null): Snapshot => ({
  token,
  notifications: [],
  unreadCount: 0,
  loading: !!token,
  saving: false,
  loadError: "",
  actionError: "",
});
type NotificationsState = Omit<Snapshot, "token"> & {
  refresh: (quiet?: boolean) => Promise<void>;
  markRead: (notificationId?: string) => Promise<void>;
};
const NotificationsContext = createContext<NotificationsState | null>(null);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token } = useAuth();
  const activeToken = useRef(token);
  activeToken.current = token;
  const [snapshot, setSnapshot] = useState(() => empty(token));
  const sequence = useRef(0);
  const busy = useRef(false);
  const inFlight = useRef<{ token: string; promise: Promise<void> } | null>(
    null,
  );
  const state = snapshot.token === token ? snapshot : empty(token);
  const latest = useRef(state);
  latest.current = state;
  const invalidate = useCallback(() => {
    ++sequence.current;
    busy.current = false;
    inFlight.current = null;
  }, []);

  const refresh = useCallback(
    (quiet = false): Promise<void> => {
      if (!token || activeToken.current !== token || busy.current)
        return Promise.resolve();
      if (inFlight.current?.token === token) return inFlight.current.promise;
      const current = ++sequence.current;
      const isCurrent = () =>
        current === sequence.current && activeToken.current === token;
      setSnapshot((previous) => ({
        ...previous,
        loadError: "",
        loading: quiet ? previous.loading : true,
      }));
      const promise = (async () => {
        try {
          const response = await fetchApi(`${API_URL}/api/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          await ensureOk(response, "Unable to load notifications.");
          const data = await response.json();
          if (
            !Array.isArray(data?.notifications) ||
            !Number.isSafeInteger(data.unreadCount) ||
            data.unreadCount < 0
          )
            throw new Error("Unable to load notifications.");
          if (isCurrent())
            setSnapshot((previous) => ({
              ...previous,
              token,
              notifications: data.notifications,
              unreadCount: data.unreadCount,
            }));
        } catch (failure) {
          if (isCurrent())
            setSnapshot((previous) => ({
              ...previous,
              loadError: requestError(failure, "Unable to load notifications."),
            }));
        } finally {
          if (isCurrent()) {
            inFlight.current = null;
            setSnapshot((previous) => ({ ...previous, loading: false }));
          }
        }
      })();
      inFlight.current = { token, promise };
      return promise;
    },
    [token],
  );

  useEffect(() => {
    invalidate();
    setSnapshot(empty(token));
    void refresh();
    return invalidate;
  }, [token, refresh, invalidate]);

  useEffect(() => {
    if (!token) return;
    let disposed = false;
    let nativeActive = true;
    let removeNative: (() => Promise<void>) | undefined;
    const resume = () => {
      if (!disposed && nativeActive && document.visibilityState !== "hidden")
        void refresh(true);
    };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    const interval = window.setInterval(resume, 60000);
    if (Capacitor.isNativePlatform()) {
      void NativeApp.addListener("appStateChange", ({ isActive }) => {
        nativeActive = isActive;
        if (isActive) resume();
      })
        .then((handle) => {
          if (disposed) return handle.remove();
          removeNative = () => handle.remove();
        })
        .catch(() => undefined);
    }
    return () => {
      disposed = true;
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
      window.clearInterval(interval);
      if (removeNative) void removeNative().catch(() => undefined);
    };
  }, [token, refresh]);

  const markRead = async (notificationId?: string) => {
    const currentState = latest.current;
    if (
      !token ||
      busy.current ||
      currentState.loading ||
      currentState.loadError
    )
      return;
    const selected = currentState.notifications.find(
      (item) => item.notification_id === notificationId,
    );
    if (notificationId && (!selected || selected.read_at)) return;
    if (!notificationId && currentState.unreadCount === 0) return;
    busy.current = true;
    const current = ++sequence.current;
    inFlight.current = null;
    const isCurrent = () =>
      current === sequence.current && activeToken.current === token;
    setSnapshot((previous) => ({ ...previous, saving: true, actionError: "" }));
    let acknowledged = false;
    try {
      const response = await fetchApi(`${API_URL}/api/notifications`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          notificationId ? { notificationId } : { all: true },
        ),
      });
      await ensureOk(response, "Unable to update notifications.");
      const result = await response.json();
      if (result?.success !== true)
        throw new Error(
          "Unable to confirm read status. Refresh notifications before retrying.",
        );
      if (!isCurrent()) return;
      acknowledged = true;
      const readAt = new Date().toISOString();
      setSnapshot((previous) => ({
        ...previous,
        notifications: previous.notifications.map((item) =>
          !notificationId || item.notification_id === notificationId
            ? { ...item, read_at: item.read_at || readAt }
            : item,
        ),
        unreadCount: notificationId ? Math.max(0, previous.unreadCount - 1) : 0,
      }));
    } catch (failure) {
      if (isCurrent())
        setSnapshot((previous) => ({
          ...previous,
          actionError: requestError(failure, "Unable to update notifications."),
        }));
    } finally {
      if (isCurrent()) {
        busy.current = false;
        setSnapshot((previous) => ({ ...previous, saving: false }));
        if (acknowledged) void refresh(true);
      }
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        loading: state.loading,
        saving: state.saving,
        loadError: state.loadError,
        actionError: state.actionError,
        refresh,
        markRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context)
    throw new Error(
      "useNotifications must be used inside NotificationsProvider",
    );
  return context;
}
