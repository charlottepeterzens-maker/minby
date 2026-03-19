import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFirstTimeUser = () => {
  const { user } = useAuth();
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const check = async () => {
      const [friendsRes, postsRes] = await Promise.all([
        supabase
          .from("friend_requests")
          .select("id", { count: "exact", head: true })
          .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
          .eq("status", "accepted"),
        supabase
          .from("life_posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const friendCount = friendsRes.count ?? 0;
      const postCount = postsRes.count ?? 0;

      setIsFirstTime(friendCount === 0 && postCount === 0);
      setLoading(false);
    };

    check();
  }, [user]);

  const dismiss = () => setIsFirstTime(false);

  return { isFirstTime, loading, dismiss };
};
