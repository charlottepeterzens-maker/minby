import { useState, useCallback } from "react";
import { Sparkles, ChevronDown, ChevronUp, ArrowRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface ChatSummaryCardProps {
  messages: { sender: string; content: string }[];
  members: { display_name: string }[];
  groupName: string;
  onCreatePlan?: (suggestion: { title: string; dateText: string }) => void;
  totalMessageCount: number;
}

interface SummaryData {
  bullets: string[];
  action: string | null;
  planSuggestion: { title: string; dateText: string } | null;
}

const ChatSummaryCard = ({ messages, members, groupName, onCreatePlan, totalMessageCount }: ChatSummaryCardProps) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);
  const [messageCountAtSummary, setMessageCountAtSummary] = useState<number>(0);

  const newSinceLastSummary = summary ? Math.max(0, totalMessageCount - messageCountAtSummary) : 0;

  const fetchSummary = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("chat-summary", {
        body: { messages, members, groupName },
      });
      if (fnError) throw fnError;
      setSummary(data);
      setMessageCountAtSummary(totalMessageCount);
      setExpanded(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, members, groupName, totalMessageCount]);

  // No summary yet — show compact pill
  if (!summary && !loading) {
    return (
      <div className="sticky top-0 z-30 px-4 pt-2 pb-1" style={{ backgroundColor: "#F7F3EF" }}>
        <button
          onClick={fetchSummary}
          disabled={messages.length < 3}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-opacity disabled:opacity-30"
          style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
        >
          <Sparkles className="w-3 h-3" />
          Sammanfatta
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sticky top-0 z-30 px-4 pt-2 pb-1" style={{ backgroundColor: "#F7F3EF" }}>
        <div className="p-2.5 rounded-[10px] flex items-center gap-2" style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4" }}>
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ color: "#7A6A85" }} />
          <span className="text-[11px]" style={{ color: "#7A6A85" }}>Sammanfattar...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sticky top-0 z-30 px-4 pt-2 pb-1" style={{ backgroundColor: "#F7F3EF" }}>
        <button onClick={fetchSummary} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: "#EDE8F4", color: "#7A6A85" }}>
          <Sparkles className="w-3 h-3" />
          Försök igen
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="sticky top-0 z-30 px-4 pt-2 pb-1" style={{ backgroundColor: "#F7F3EF" }}>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[10px] overflow-hidden"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4" }}
      >
        {/* Collapsed bar — always visible */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#7A6A85" }} />
            <span className="text-[11px] font-medium" style={{ color: "#3C2A4D" }}>
              Sammanfattning
            </span>
            {newSinceLastSummary > 0 && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "#EDE8F4", color: "#7A6A85" }}
              >
                +{newSinceLastSummary} nya
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {newSinceLastSummary > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchSummary();
                }}
                className="p-1 rounded-full hover:opacity-70 transition-opacity"
                style={{ color: "#9B8BA5" }}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" style={{ color: "#9B8BA5" }} />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "#9B8BA5" }} />
            )}
          </div>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-2">
                <ul className="space-y-1">
                  {summary.bullets.map((b, i) => (
                    <li key={i} className="text-[12px] leading-relaxed flex gap-1.5" style={{ color: "#3C2A4D" }}>
                      <span style={{ color: "#9B8BA5" }}>•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {summary.action && (
                  <p className="text-[11px] italic" style={{ color: "#7A6A85" }}>
                    {summary.action}
                  </p>
                )}

                {summary.planSuggestion && onCreatePlan && (
                  <button
                    onClick={() => onCreatePlan(summary.planSuggestion!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "#EAF2E8", color: "#1F4A1A" }}
                  >
                    Gör detta till en plan
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                <button
                  onClick={fetchSummary}
                  className="text-[10px] font-medium"
                  style={{ color: "#9B8BA5" }}
                >
                  Uppdatera
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ChatSummaryCard;
