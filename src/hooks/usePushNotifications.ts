import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * VAPID public key — this is a publishable key, safe to embed in client code.
 * It MUST match the VAPID_PUBLIC_KEY secret configured in the backend.
 * If you rotate VAPID keys, update this value AND the backend secret simultaneously.
 */
const VAPID_PUBLIC_KEY = "Hasselblad#20";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [subscribed, setSubscribed] = useState(false);
  const subscribingRef = useRef(false);

  const isSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  const subscribe = useCallback(async () => {
    if (!isSupported || !user || subscribingRef.current) return false;
    subscribingRef.current = true;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        subscribingRef.current = false;
        return false;
      }

      const vapidPublicKey = VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        subscribingRef.current = false;
        return false;
      }

      // Register push service worker
      const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
        });
      }

      const subJson = subscription.toJSON();
      
      // Save to database
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subJson.keys?.p256dh || "",
          auth: subJson.keys?.auth || "",
        },
        { onConflict: "user_id,endpoint" }
      );

      setSubscribed(true);
      subscribingRef.current = false;
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      subscribingRef.current = false;
      return false;
    }
  }, [isSupported, user, getVapidPublicKey]);

  // Check if already subscribed on mount
  useEffect(() => {
    if (!isSupported || !user) return;
    
    const check = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (registration) {
          const sub = await registration.pushManager.getSubscription();
          if (sub) setSubscribed(true);
        }
      } catch {
        // ignore
      }
    };
    check();
  }, [isSupported, user]);

  return { isSupported, permission, subscribed, subscribe };
};
