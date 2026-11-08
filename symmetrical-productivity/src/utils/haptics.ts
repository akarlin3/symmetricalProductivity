/**
 * Tactile haptic feedback helper for mobile / supported browsers.
 * Safely invokes navigator.vibrate([15]) without throwing on unsupported platforms or SSR.
 */
export function triggerHaptic(pattern: number | number[] = [15]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore on unsupported devices or restricted contexts
  }
}
