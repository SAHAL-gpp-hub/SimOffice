/**
 * SimOffice Teacher Console — Reactive Event Bus & Activity Store
 * Centralizes real-time mission telemetry, student joins, test checks,
 * instructor clues, and broadcast announcements across all dashboard components.
 */

export interface TimelineEvent {
  id: string;
  time: string;
  timeMs: number;
  type: 'join' | 'seated' | 'check' | 'hint' | 'broadcast' | 'resolved' | 'error' | 'status';
  title: string;
  desc: string;
  teamId?: string;
  badge?: string;
}

export interface SentAnnouncement {
  id: string;
  time: string;
  text: string;
  target: string;
}

type Listener = () => void;

class TeacherEventBus {
  private events: TimelineEvent[] = [];
  private announcements: SentAnnouncement[] = [];
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  constructor() {
    this.initDefaultEvents();
  }

  private initDefaultEvents() {
    if (this.initialized) return;
    this.initialized = true;

    const now = Date.now();
    this.events = [
      {
        id: 'evt-init',
        time: 'Active',
        timeMs: now,
        type: 'status',
        title: 'Mission Command Online',
        desc: 'Tactical telemetry stream connected to active classroom session.',
        badge: 'SYSTEM',
      },
      {
        id: 'evt-bc-0',
        time: 'Session Start',
        timeMs: now - 1000 * 60 * 3,
        type: 'broadcast',
        title: 'Initial Mission Directive',
        desc: 'Incident simulation initiated. Report to assigned department workstations.',
        badge: 'BROADCAST',
      },
    ];

    this.announcements = [
      {
        id: 'ann-init',
        time: 'Session Start',
        text: 'Incident simulation initiated. Report to assigned department workstations.',
        target: 'All Teams',
      },
    ];
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('[TeacherEventBus] Listener error:', err);
      }
    });
  }

  public getEvents(): TimelineEvent[] {
    return [...this.events].sort((a, b) => b.timeMs - a.timeMs);
  }

  public getAnnouncements(): SentAnnouncement[] {
    return [...this.announcements];
  }

  public addEvent(event: Omit<TimelineEvent, 'id' | 'timeMs' | 'time'> & { time?: string }): TimelineEvent {
    const timeMs = Date.now();
    const timeStr = event.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullEvent: TimelineEvent = {
      ...event,
      id: `evt-${timeMs}-${Math.random().toString(36).substring(2, 7)}`,
      time: timeStr,
      timeMs,
    };

    this.events.unshift(fullEvent);
    if (this.events.length > 50) {
      this.events.pop();
    }

    this.notify();
    return fullEvent;
  }

  public addAnnouncement(text: string, target = 'All Teams') {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const announcement: SentAnnouncement = {
      id: `ann-${Date.now()}`,
      time: timeStr,
      text,
      target,
    };

    this.announcements.unshift(announcement);

    // Also dispatch to the main event timeline!
    this.addEvent({
      type: 'broadcast',
      title: `Directive Broadcast to ${target}`,
      desc: text,
      badge: 'COMMS',
    });

    this.notify();
  }

  public recordHintSent(teamName: string, hintTitle: string, hintText: string) {
    this.addEvent({
      type: 'hint',
      title: `Tactical Clue Pushed: ${hintTitle}`,
      desc: `Dispatched to ${teamName}: "${hintText.slice(0, 90)}${hintText.length > 90 ? '...' : ''}"`,
      badge: 'CLUE',
    });
  }

  public recordCheckResult(teamName: string, checkName: string, passed: boolean, durationMs: number) {
    this.addEvent({
      type: passed ? 'check' : 'error',
      title: `${checkName} · ${passed ? 'VERIFIED PASS' : 'CHECK FAILED'}`,
      desc: `${teamName} executed ${checkName} (${durationMs}ms). ${passed ? 'All boundary assertions passed.' : 'Assertion failure encountered.'}`,
      badge: passed ? 'PASS' : 'FAIL',
    });
  }

  public recordStudentPresence(displayName: string, teamName: string, action: 'joined' | 'seated' | 'disconnected', deskId?: string) {
    const type = action === 'seated' ? 'seated' : action === 'joined' ? 'join' : 'status';
    const actionDesc =
      action === 'seated'
        ? `Seated at ${deskId || 'workstation desk'} in ${teamName}`
        : action === 'joined'
        ? `Connected to ${teamName} sector`
        : `Disconnected from ${teamName}`;

    this.addEvent({
      type,
      title: `Agent ${displayName} ${action === 'seated' ? 'Seated' : action === 'joined' ? 'Online' : 'Offline'}`,
      desc: actionDesc,
      badge: action === 'seated' ? 'SEATED' : 'PRESENCE',
    });
  }
}

export const teacherEventBus = new TeacherEventBus();
