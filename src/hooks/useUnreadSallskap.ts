import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnreadSallskap = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!user) { setCount(0); return; }

    const [pendingRes, membershipsRes] = await Promise.all([
      supabase
        .from("friend_requests")
        .select("*", { count: "exact", head: true })
        .eq("to_user_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("group_memberships")
        .select("group_id, joined_at")
        .eq("user_id", user.id),
    ]);

    let total = pendingRes.count || 0;

    const memberships = membershipsRes.data || [];
    if (memberships.length > 0) {
      for (const m of memberships) {
        const { data: lastMsg } = await supabase
          .from("group_messages")
          .select("created_at, user_id")
          .eq("group_id", m.group_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (
          lastMsg?.created_at &&
          lastMsg.user_id !== user.id &&
          new Date(lastMsg.created_at) > new Date(m.joined_at)
        ) {
          total++;
        }
      }
    }

    setCount(total);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-sallskap")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "friend_requests",
        filter: `to_user_id=eq.${user.id}`,
      }, () => fetch())
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "group_messages",
      }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetch]);

  return { count, refresh: fetch };
};
