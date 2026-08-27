"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  NotificationResponse,
} from "@/lib/notifications";

function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 7)}w ago`;
}

export default function NavBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationResponse[] | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(() => {
      if (!open) refreshUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function refreshUnreadCount() {
    try {
      const { count } = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // notifications are a nice-to-have — fail silently
    }
  }

  async function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        setNotifications(await listNotifications());
      } catch {
        setNotifications([]);
      }
    }
  }

  function handleNotificationClick(n: NotificationResponse) {
    if (!n.read) {
      setNotifications((prev) => (prev ? prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)) : prev));
      setUnreadCount((c) => Math.max(0, c - 1));
      markAsRead(n.id).catch(() => {});
    }
    setOpen(false);
    if (n.groupId) router.push(`/groups/${n.groupId}`);
  }

  async function handleMarkAllAsRead() {
    setNotifications((prev) => (prev ? prev.map((x) => ({ ...x, read: true })) : prev));
    setUnreadCount(0);
    try {
      await markAllAsRead();
    } catch {
      // best-effort — the badge resyncs on the next poll
    }
  }

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight text-ink">
          Splitwise
        </Link>

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={togglePanel}
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-line/30"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-debt px-1 font-mono text-[10px] font-bold leading-none text-paper">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-sm border border-line bg-paper shadow-sm">
              <div className="perforated-top" aria-hidden="true" />

              <div className="flex items-center justify-between px-4 pb-3 pt-2">
                <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink">
                  Notifications
                </h2>
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="font-mono text-xs font-bold text-ledger-green hover:text-ledger-green-dark"
                >
                  Mark all as read
                </button>
              </div>
              <div className="stitch-divider" aria-hidden="true" />

              <div className="max-h-96 overflow-y-auto">
                {notifications === null ? (
                  <p className="px-4 py-6 text-center font-mono text-sm text-ink/60">Loading…</p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center font-mono text-sm text-ink/60">
                    No notifications yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-line/60">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-line/20"
                        >
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                              n.read ? "bg-transparent" : "bg-ledger-green"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className={`block font-sans text-sm ${n.read ? "text-ink/50" : "text-ink"}`}>
                              {n.message}
                            </span>
                            <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-ink/40">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
