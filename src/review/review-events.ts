export interface ReviewEvent {
  readonly at: string;
  readonly kind: string;
  readonly detail: string;
}

export interface ReviewEventLog {
  record(kind: string, detail: string, at?: number): void;
  entries(): readonly ReviewEvent[];
  clear(): void;
}

const MAX_EVENTS = 30;

export function createReviewEventLog(): ReviewEventLog {
  const events: ReviewEvent[] = [];

  return {
    record(kind, detail, at = Date.now()) {
      events.push({ at: new Date(at).toISOString(), kind, detail });
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    },
    entries() {
      return events.slice();
    },
    clear() {
      events.length = 0;
    },
  };
}
