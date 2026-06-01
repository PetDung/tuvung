/**
 * Global event emitter for API errors.
 * Bridges axios interceptor (outside React) to React components.
 *
 * Stores listeners on window to survive TurboPack HMR.
 * Queues events if no listener is registered yet (handles startup race).
 * Only replays events within the last 5 seconds to avoid stale error toasts
 * (e.g., login errors replayed after successful login).
 */

export interface ApiErrorEvent {
  status: number;
  url: string;
  method?: string;
  message: string;
  error: any;
  _queuedAt?: number; // timestamp when event was queued
}

type ApiErrorCallback = (event: ApiErrorEvent) => void;

const EVENT_CAPACITY = 50;
const REPLAY_WINDOW_MS = 5000; // only replay events within the last 5 seconds

function getListeners(): ApiErrorCallback[] {
  if (typeof window === 'undefined') return [];
  if (!(window as any).__apiErrorListeners) {
    (window as any).__apiErrorListeners = [];
  }
  return (window as any).__apiErrorListeners;
}

function getEventQueue(): ApiErrorEvent[] {
  if (typeof window === 'undefined') return [];
  if (!(window as any).__apiErrorQueue) {
    (window as any).__apiErrorQueue = [];
  }
  return (window as any).__apiErrorQueue;
}

export function onApiError(callback: ApiErrorCallback): () => void {
  const listeners = getListeners();
  listeners.push(callback);

  // Replay only fresh events from the queue (within REPLAY_WINDOW_MS)
  const now = Date.now();
  const queue = getEventQueue();
  while (queue.length > 0) {
    const event = queue[0];
    // Discard stale events (older than REPLAY_WINDOW_MS)
    if (event._queuedAt && now - event._queuedAt > REPLAY_WINDOW_MS) {
      queue.shift();
      continue;
    }
    queue.shift(); // remove from queue
    try {
      callback(event);
    } catch (e) {
      console.error('[apiErrorEmitter] Listener threw on queued event:', e);
    }
  }

  return () => {
    const current = getListeners();
    const idx = current.indexOf(callback);
    if (idx >= 0) current.splice(idx, 1);
  };
}

export function emitApiError(event: ApiErrorEvent): void {
  const listeners = getListeners();

  if (listeners.length === 0) {
    // No listener yet — queue the event for later
    const queue = getEventQueue();
    if (queue.length < EVENT_CAPACITY) {
      queue.push({ ...event, _queuedAt: Date.now() });
    }
    return;
  }

  listeners.forEach((l) => {
    try {
      l(event);
    } catch (e) {
      console.error('[apiErrorEmitter] Listener threw:', e);
    }
  });
}
