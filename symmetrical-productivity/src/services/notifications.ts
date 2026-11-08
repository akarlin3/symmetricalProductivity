import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type SymmetryNotificationEvent =
  | 'ROLLOVER_5M_TO_15M'
  | 'CHECKIN_20M_CHIME'
  | 'MANDATORY_60M_BREAK'
  | 'WORK_BLOCK_COMPLETE'
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

const SCHEDULED_IDS = {
  ROLLOVER_5M: 1001,
  CHECKIN_20M: 1002,
  BREAK_60M: 1003,
};

let nextImmediateNotificationId = 2000;

/**
 * Synthesizes a clean mechanical two-tone chime via Web Audio API
 * so transitions are audible even when browser notifications are muted.
 */
export function playMechanicalChime(pattern: 'ROLLOVER' | 'CHECKIN' | 'BREAK_60M') {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const freqs =
      pattern === 'ROLLOVER'
        ? [523.25, 659.25] // C5 -> E5
        : pattern === 'CHECKIN'
        ? [587.33, 880.0] // D5 -> A5
        : [440.0, 329.63, 440.0]; // A4 -> E4 -> A4

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.14);
      gain.gain.setValueAtTime(0.08, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.13);
    });
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

/**
 * Initializes the high-priority Android Notification Channel with PUBLIC
 * lock-screen visibility (visibility: 1) and wake-up importance (importance: 5).
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
        name: 'SymmetryManager Lock-Screen Timer Alerts',
        description:
          '5m Startup Step rollover, 20m Check-In chimes, and 60m Mandatory Break lock-screen alerts',
        importance: 5, // IMPORTANCE_HIGH (heads-up + lock screen wake)
        visibility: 1, // VISIBILITY_PUBLIC (full content shown on Android lock screen)
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
    // Fallback if permissions API is blocked in headless environment
  }
  return { granted: false, platform };
}

/**
 * Fires an immediate high-priority notification for lock screen + Service Worker + in-app log.
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
      : 'CHECKIN'
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
    } else if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
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
 * Schedules ahead-of-time exact lock-screen alarms via Capacitor LocalNotifications
 * with `allowWhileIdle: true` so Android Doze mode never suppresses a running
 * 5m Startup Step rollover, 20m Check-In chime, or 60m Mandatory Break alert.
 */
export async function scheduleLockScreenStageAlarm(
  eventType: SymmetryNotificationEvent,
  secondsFromNow: number,
  title: string,
  body: string
): Promise<void> {
  if (secondsFromNow <= 0) return;
  const notifId =
    eventType === 'ROLLOVER_5M_TO_15M'
      ? SCHEDULED_IDS.ROLLOVER_5M
      : eventType === 'CHECKIN_20M_CHIME'
      ? SCHEDULED_IDS.CHECKIN_20M
      : SCHEDULED_IDS.BREAK_60M;

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
              at: new Date(Date.now() + secondsFromNow * 1000),
              allowWhileIdle: true,
            },
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#0EA5E9',
            extra: { eventType, scheduledAheadSeconds: secondsFromNow },
          },
        ],
      });
    } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
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
    // Ignore scheduling errors when running in restricted web contexts
  }
}

export async function cancelAllScheduledStageAlarms(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({
        notifications: [
          { id: SCHEDULED_IDS.ROLLOVER_5M },
          { id: SCHEDULED_IDS.CHECKIN_20M },
          { id: SCHEDULED_IDS.BREAK_60M },
        ],
      });
    } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CANCEL_LOCKSCREEN_ALARMS',
      });
    }
  } catch {
    // Ignore
  }
}
