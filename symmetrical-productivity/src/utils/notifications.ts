import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type SymmetryNotificationEvent =
  | 'ROLLOVER_5M_TO_15M'
  | 'CHECKIN_20M_CHIME'
  | 'MANDATORY_60M_BREAK'
  | 'WORK_BLOCK_COMPLETE'
  | 'BREAK_COMPLETE'
  | 'STRESS_RESET_COMPLETE';

export interface NotificationLogEntry {
  id: number;
  eventType: SymmetryNotificationEvent;
  title: string;
  body: string;
  channelId: string;
  timestampIso: string;
  deliveryTarget: 'CAPACITOR_ANDROID_LOCKSCREEN' | 'WEB_SW_LOCKSCREEN' | 'IN_APP_FALLBACK';
  scheduledAheadSeconds?: number;
}

export const ANDROID_CHANNEL_ID = 'symmetry_timers_high';

const SCHEDULED_IDS: Record<SymmetryNotificationEvent, number> = {
  ROLLOVER_5M_TO_15M: 1001,
  CHECKIN_20M_CHIME: 1002,
  MANDATORY_60M_BREAK: 1003,
  WORK_BLOCK_COMPLETE: 1004,
  BREAK_COMPLETE: 1005,
  STRESS_RESET_COMPLETE: 1006,
};

const ALL_SCHEDULED_NOTIFICATION_IDS = Object.values(SCHEDULED_IDS).map((id) => ({ id }));
const webScheduledTimeouts = new Map<number, number>();

let nextImmediateNotificationId = 2000;
let sharedAudioContext: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

export type ChimePattern = 'ROLLOVER' | 'COMPLETE' | 'CHECKIN' | 'BREAK_60M';

/**
 * Synthesizes a gentle mechanical two-tone sine wave chime via Web Audio API.
 */
export function playMechanicalChime(pattern: ChimePattern = 'ROLLOVER') {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const twoToneFreqs: [number, number] =
      pattern === 'ROLLOVER'
        ? [523.25, 659.25] // C5 -> E5 (5m -> 15m rollover)
        : pattern === 'COMPLETE'
        ? [587.33, 783.99] // D5 -> G5 (20m block or break finish)
        : pattern === 'CHECKIN'
        ? [523.25, 783.99] // C5 -> G5 (20m/40m Evening Check-In)
        : [659.25, 523.25]; // E5 -> C5 (60m Mandatory Break)

    twoToneFreqs.forEach((freq, idx) => {
      const startTime = now + idx * 0.18;
      const duration = 0.22;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.09, startTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    });
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

/**
 * Initializes native Capacitor LocalNotifications channel or Web Notification permissions.
 */
export async function initSymmetryNotifications(): Promise<{
  granted: boolean;
  platform: string;
}> {
  const platform = Capacitor.getPlatform();
  try {
    if (Capacitor.isNativePlatform()) {
      const perm = await LocalNotifications.requestPermissions();
      await LocalNotifications.createChannel({
        id: ANDROID_CHANNEL_ID,
        name: 'Symmetrical Productivity Timer Alerts',
        description:
          '5m Startup Step rollover, 20m Check-In chimes, and 60m Mandatory Break lock-screen alerts',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#38BDF8',
      });
      return { granted: perm.display === 'granted', platform };
    }

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        return { granted: true, platform: 'web' };
      }
      if (Notification.permission !== 'denied') {
        const status = await Notification.requestPermission();
        return { granted: status === 'granted', platform: 'web' };
      }
    }
  } catch {
    // Fallback if permissions API is blocked
  }
  return { granted: false, platform };
}

/**
 * Fires an immediate notification and plays the gentle two-tone synthesizer chime.
 */
export async function fireSymmetryNotification(
  eventType: SymmetryNotificationEvent,
  title: string,
  body: string
): Promise<NotificationLogEntry> {
  const id = ++nextImmediateNotificationId;
  playMechanicalChime(
    eventType === 'ROLLOVER_5M_TO_15M'
      ? 'ROLLOVER'
      : eventType === 'MANDATORY_60M_BREAK'
      ? 'BREAK_60M'
      : eventType === 'CHECKIN_20M_CHIME'
      ? 'CHECKIN'
      : 'COMPLETE'
  );

  let deliveryTarget: NotificationLogEntry['deliveryTarget'] = 'IN_APP_FALLBACK';

  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            channelId: ANDROID_CHANNEL_ID,
            schedule: {
              at: new Date(Date.now() + 150),
              allowWhileIdle: true,
            },
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#0EA5E9',
            extra: { eventType },
          },
        ],
      });
      deliveryTarget = 'CAPACITOR_ANDROID_LOCKSCREEN';
    } else if ('Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            tag: `symmetry-${eventType}-${id}`,
            renotify: true,
            requireInteraction: eventType === 'MANDATORY_60M_BREAK',
            vibrate: [200, 100, 200],
            data: { eventType },
          } as NotificationOptions);
          deliveryTarget = 'WEB_SW_LOCKSCREEN';
        } else {
          new Notification(title, { body, tag: `symmetry-${eventType}-${id}` });
          deliveryTarget = 'WEB_SW_LOCKSCREEN';
        }
      } else {
        new Notification(title, { body, tag: `symmetry-${eventType}-${id}` });
        deliveryTarget = 'WEB_SW_LOCKSCREEN';
      }
    }
  } catch {
    deliveryTarget = 'IN_APP_FALLBACK';
  }

  return {
    id,
    eventType,
    title,
    body,
    channelId: ANDROID_CHANNEL_ID,
    timestampIso: new Date().toISOString(),
    deliveryTarget,
  };
}

/**
 * Schedules a local notification at the exact target timestamp (`new Date(targetEndTimeMs)`)
 * on either native Capacitor (`Capacitor.isNativePlatform()`) or Web (`Notification` API + Service Worker).
 */
export async function scheduleTimerNotificationAt(
  targetEndTimeMs: number,
  title: string,
  body: string,
  eventType: SymmetryNotificationEvent = 'ROLLOVER_5M_TO_15M'
): Promise<void> {
  const delayMs = targetEndTimeMs - Date.now();
  if (delayMs <= 0) return;

  const notifId = SCHEDULED_IDS[eventType] ?? SCHEDULED_IDS.ROLLOVER_5M_TO_15M;
  const secondsFromNow = Math.max(1, Math.ceil(delayMs / 1000));

  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            channelId: ANDROID_CHANNEL_ID,
            schedule: {
              at: new Date(targetEndTimeMs),
              allowWhileIdle: true,
            },
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#0EA5E9',
            extra: { eventType, targetEndTimeMs },
          },
        ],
      });
      return;
    }

    // Web Notification API + Service Worker scheduling at exact targetEndTimeMs delta
    const existingTimeout = webScheduledTimeouts.get(notifId);
    if (existingTimeout !== undefined) {
      window.clearTimeout(existingTimeout);
    }

    const timeoutId = window.setTimeout(() => {
      webScheduledTimeouts.delete(notifId);
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            tag: `symmetry-scheduled-${notifId}`,
          });
        } catch {
          // Ignore if ServiceWorker notification handles it
        }
      }
    }, delayMs);

    webScheduledTimeouts.set(notifId, timeoutId);

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_LOCKSCREEN_ALARM',
        id: notifId,
        eventType,
        secondsFromNow,
        title,
        body,
      });
    }
  } catch {
    // Ignore scheduling errors in restricted contexts
  }
}

export async function scheduleLockScreenStageAlarm(
  eventType: SymmetryNotificationEvent,
  secondsFromNow: number,
  title: string,
  body: string
): Promise<void> {
  if (secondsFromNow <= 0) return;
  await scheduleTimerNotificationAt(
    Date.now() + secondsFromNow * 1000,
    title,
    body,
    eventType
  );
}

/**
 * Cancels all pending scheduled timer notifications on both native Capacitor and Web.
 */
export async function cancelAllScheduledStageAlarms(): Promise<void> {
  try {
    for (const timeoutId of webScheduledTimeouts.values()) {
      window.clearTimeout(timeoutId);
    }
    webScheduledTimeouts.clear();

    if (Capacitor.isNativePlatform()) {
      const pending = await LocalNotifications.getPending();
      const idsToCancel =
        pending.notifications.length > 0
          ? pending.notifications.map((n) => ({ id: n.id }))
          : ALL_SCHEDULED_NOTIFICATION_IDS;
      await LocalNotifications.cancel({ notifications: idsToCancel });
    } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CANCEL_LOCKSCREEN_ALARMS',
      });
    }
  } catch {
    // Ignore cancellation errors
  }
}
