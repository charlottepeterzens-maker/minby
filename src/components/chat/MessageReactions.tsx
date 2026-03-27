import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const REACTION_EMOJIS = ["❤️", "😂", "👍", "😮", "🥰", "🔥"];

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface Props {
  messageId: string;
  isOwn: boolean;
  reactions: Reaction[];
  onReactionsChange: () => void;
  pickerOpen: boolean;
  onPickerToggle: (open: boolean) => void;
}

const MessageReactions = ({ messageId, isOwn, reactions, onReactionsChange, pickerOpen, onPickerToggle }: Props) => {
  const { user } = useAuth();

  const grouped = reactions.reduce<Record<string, { count: number; userReacted: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, userReacted: false };
    acc[r.emoji].count++;
    if (r.user_id === user?.id) acc[r.emoji].userReacted = true;
    return acc;
  }, {});

  const handleReact = async (emoji: string) => {
    if (!user) return;
    onPickerToggle(false);

    const existing = reactions.find((r) => r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("message_reactions" as any).delete().eq("id", existing.id);
    } else {
      await (supabase as any).from("message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }
    onReactionsChange();
  };

  const hasReactions = Object.keys(grouped).length > 0;

  return (
    <div className={`relative ${isOwn ? "flex flex-col items-end" : "flex flex-col items-start"}`}>
      {/* Reaction pills */}
      {hasReactions && (
        <div className={`flex gap-0.5 flex-wrap ${isOwn ? "justify-end" : "justify-start"} -mt-1.5 mb-0.5 px-1`}>
          {Object.entries(grouped).map(([emoji, data]) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 transition-all"
              style={{
                backgroundColor: data.userReacted ? "#EDE8F4" : "#F7F3EF",
                border: data.userReacted ? "1px solid #C9B8D8" : "none",
              }}
            >
              <span style={{ fontSize: 11 }}>{emoji}</span>
              {data.count > 1 && (
                <span className="text-[9px] font-medium" style={{ color: "#7A6A85" }}>
                  {data.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Picker popup */}
      <AnimatePresence>
        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => onPickerToggle(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 flex gap-1 rounded-full px-2 py-1.5 shadow-lg"
              style={{
                backgroundColor: "#FFFFFF",
                border: "none",
                bottom: "100%",
                marginBottom: 4,
                [isOwn ? "right" : "left"]: 0,
              }}
            >
              {REACTION_EMOJIS.map((emoji) => {
                const isActive = grouped[emoji]?.userReacted;
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: isActive ? "#EDE8F4" : "transparent",
                      fontSize: 18,
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageReactions;
