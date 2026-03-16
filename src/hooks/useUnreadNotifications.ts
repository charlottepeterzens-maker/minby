import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnreadNotifications = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!user) { setCount(0); return; }
    const { count: c } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setCount(c || 0);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  // Subscribe to realtime inserts
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-notifs")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        setCount(prev => prev + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { count, refresh: fetch };
};
