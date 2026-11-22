import { supabase } from "@/integrations/supabase/client";

/** True when running as an installed PWA (standalone) — the only mode where
 * iOS Safari allows push notifications at all. */
export const isStandalonePwa = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const getVapidPublicKey = async (): Promise<string | null> => {
  const { data, error } = await supabase.functions.invoke("generate-vapid-keys");
  if (error || !data?.publicKey) return null;
  return data.publicKey as string;
};

/** Requests browser notification permission, if not already decided. */
export const ensureNotificationPermission = async (): Promise<NotificationPermission | "unsupported"> => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
};

/**
 * Subscribes this device to Web Push (if not already) and saves it so the
 * backend can reach it. Returns true if a usable subscription now exists.
 */
export const subscribeToPush = async (userId: string): Promise<boolean> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const publicKey = await getVapidPublicKey();
      if (!publicKey) return false;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: "endpoint" },
    );
    return !error;
  } catch (e) {
    console.error("subscribeToPush failed", e);
    return false;
  }
};

/**
 * Full opt-in flow for a notification choice that isn't "silent": only runs
 * on iOS/standalone-gated platforms when actually installed, asks for OS
 * permission if undecided, and subscribes this device.
 */
export const enablePushNotifications = async (userId: string): Promise<boolean> => {
  if (!isStandalonePwa() && /iphone|ipad|ipod/i.test(navigator.userAgent)) return false;
  const permission = await ensureNotificationPermission();
  if (permission !== "granted") return false;
  return subscribeToPush(userId);
};
