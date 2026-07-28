import { useCallback, useEffect, useState } from 'react';
import { fetchAPI } from '../services/api';

const POLL_INTERVAL_MS = 30000;

// Polls the unread notification count and fetches the list on demand (dropdown open).
// No realtime/broadcast infra exists in this app yet, so polling is the simplest option.
export function useNotifications(enabled = true) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const refreshUnreadCount = useCallback(async () => {
        if (!enabled) return;
        try {
            const res = await fetchAPI('/notifications/unread-count');
            setUnreadCount(res?.data?.count ?? 0);
        } catch {
            // Silent — this runs on a background poll, no user-facing error surface needed.
        }
    }, [enabled]);

    const loadNotifications = useCallback(async (targetPage = 1) => {
        if (!enabled) return;
        setLoading(true);
        try {
            const res = await fetchAPI(`/notifications?page=${targetPage}`);
            setNotifications(res?.data ?? []);
            setPage(res?.meta?.current_page ?? targetPage);
            setTotalPages(res?.meta?.last_page ?? 1);
        } catch {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    const markAsRead = useCallback(async (id) => {
        setNotifications((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
        try {
            await fetchAPI(`/notifications/${id}/read`, { method: 'POST' });
        } catch {
            // Silent — optimistic local update already applied, count will self-correct on next poll.
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
        setUnreadCount(0);
        try {
            await fetchAPI('/notifications/read-all', { method: 'POST' });
        } catch {
            // Silent — same rationale as markAsRead.
        }
    }, []);

    useEffect(() => {
        if (!enabled) return undefined;
        refreshUnreadCount();
        const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [enabled, refreshUnreadCount]);

    return {
        notifications, unreadCount, loading, page, totalPages,
        loadNotifications, markAsRead, markAllAsRead,
    };
}
