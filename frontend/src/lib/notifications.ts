import { apiFetch, API_BASE_URL } from "./api";

export type NotificationType =
  | "ADDED_TO_GROUP"
  | "EXPENSE_ADDED"
  | "SETTLEMENT_RECORDED"
  | "RECURRING_EXPENSE_CREATED"
  | "MEMBER_LEFT"
  | "PAYMENT_REMINDER";

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  message: string;
  groupId: string | null;
  read: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export function listNotifications(): Promise<NotificationResponse[]> {
  return apiFetch<NotificationResponse[]>("/notifications");
}

export function getUnreadCount(): Promise<UnreadCountResponse> {
  return apiFetch<UnreadCountResponse>("/notifications/unread-count");
}

export function markAsRead(id: string): Promise<void> {
  return apiFetch<void>(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllAsRead(): Promise<void> {
  return apiFetch<void>("/notifications/read-all", { method: "PATCH" });
}

// Native EventSource can't attach an Authorization header, so this streams the response body
// manually via fetch and parses the text/event-stream format by hand. Reconnects with a fixed
// delay whenever the stream ends or errors (server restart, brief network drop, the 30-minute
// server-side timeout) — the caller just gets a stop() function to tear it down on unmount.
export function subscribeToNotifications(onNotification: (n: NotificationResponse) => void): () => void {
  const RECONNECT_DELAY_MS = 3000;
  let stopped = false;
  let abortController: AbortController | null = null;

  async function connectOnce() {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    abortController = new AbortController();
    const res = await fetch(`${API_BASE_URL}/notifications/stream`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: abortController.signal,
    });
    if (!res.ok || !res.body) throw new Error(`Notification stream failed: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (!stopped) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        handleRawEvent(rawEvent, onNotification);
      }
    }
  }

  async function loop() {
    while (!stopped) {
      try {
        await connectOnce();
      } catch {
        // network error, server restart, or abort — fall through to reconnect below
      }
      if (stopped) return;
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
    }
  }

  loop();

  return () => {
    stopped = true;
    abortController?.abort();
  };
}

function handleRawEvent(rawEvent: string, onNotification: (n: NotificationResponse) => void) {
  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    // lines starting with ":" are comments (connection/heartbeat pings) — nothing to parse
  }

  if (eventName !== "notification" || dataLines.length === 0) return;
  try {
    onNotification(JSON.parse(dataLines.join("\n")));
  } catch {
    // malformed event — skip it, the connection itself is still fine
  }
}
