import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface TypingIndicatorProps {
  groupId: string;
  userId: string;
  displayName: string;
  isTyping: boolean;
  members: { user_id: string; display_name: string }[];
}

/** Hook: broadcast typing state via Supabase Realtime presence */
export function useTypingBroadcast(groupId: string, userId: string, displayName: string) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!groupId || !userId) return;

    const channel = supabase.channel(`typing-${groupId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: { id: string; name: string }[] = [];
        for (const [key, presences] of Object.entries(state)) {
          if (key === userId) continue;
          const p = presences[0] as any;
          if (p?.typing) {
            users.push({ id: key, name: p.display_name || "Någon" });
          }
        }
        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false, display_name: displayName });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [groupId, userId, displayName]);

  const setTyping = useCallback((typing: boolean) => {
    if (!channelRef.current) return;
    channelRef.current.track({ typing, display_name: displayName });

    if (typing) {
      clearTimeout(timeoutRef.current);
      // Auto-stop after 3s of no calls
      timeoutRef.current = setTimeout(() => {
        channelRef.current?.track({ typing: false, display_name: displayName });
      }, 3000);
    }
  }, [displayName]);

  return { typingUsers, setTyping };
}

/** Visual component: animated dots with names */
export function TypingIndicator({ typingUsers }: { typingUsers: { id: string; name: string }[] }) {
  if (typingUsers.length === 0) return null;

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0].name} skriver`
      : typingUsers.length === 2
        ? `${typingUsers[0].name} och ${typingUsers[1].name} skriver`
        : `${typingUsers[0].name} och ${typingUsers.length - 1} till skriver`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-1.5 px-4 py-1"
      >
        <div className="flex gap-[3px]">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-[5px] h-[5px] rounded-full"
              style={{ backgroundColor: "hsl(var(--color-text-muted))" }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        <span className="text-[11px]" style={{ color: "hsl(var(--color-text-muted))" }}>
          {label}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
