declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[] };
    _fbq: Window['fbq'];
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!PIXEL_ID || typeof window === 'undefined' || !window.fbq) return;

  try {
    if (params) {
      window.fbq('track', eventName, params);
    } else {
      window.fbq('track', eventName);
    }
  } catch (err) {
    console.error('[meta-pixel] Failed to track event:', err instanceof Error ? err.message : String(err));
  }
}
