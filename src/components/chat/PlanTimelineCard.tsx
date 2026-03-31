import { useMemo } from "react";
import { CalendarDays, MapPin, Check, HelpCircle, X } from "lucide-react";
import { motion } from "framer-motion";

interface Rsvp {
  id: string;
  plan_id: string;
  user_id: string;
  status: string;
}

interface PlanTimelineCardProps {
  planId: string;
  title: string;
  dateText: string;
  location: string | null;
  creatorName: string;
  time: string;
  rsvps: Rsvp[];
  currentUserId: string;
  members: { user_id: string; display_name: string }[];
  onRsvp: (planId: string, status: string) => void;
}

const PlanTimelineCard = ({
  planId,
  title,
  dateText,
  location,
  creatorName,
  time,
  rsvps,
  currentUserId,
  members,
  onRsvp,
}: PlanTimelineCardProps) => {
  const userRsvp = useMemo(
    () => rsvps.find((r) => r.user_id === currentUserId),
    [rsvps, currentUserId]
  );

  const counts = useMemo(() => {
    const c = { in: 0, maybe: 0, out: 0 };
    rsvps.forEach((r) => {
      if (r.status === "in") c.in++;
      else if (r.status === "maybe") c.maybe++;
      else if (r.status === "out") c.out++;
    });
    return c;
  }, [rsvps]);

  const respondents = useMemo(() => {
    return rsvps
      .filter((r) => r.status === "in")
      .map((r) => members.find((m) => m.user_id === r.user_id)?.display_name)
      .filter(Boolean);
  }, [rsvps, members]);

  const quickReplies = [
    { status: "in", label: "Jag kan", icon: Check, bg: "#EAF2E8", color: "hsl(var(--color-accent-sage-text))", activeBorder: "#B5CCBF" },
    { status: "maybe", label: "Kanske", icon: HelpCircle, bg: "#FFF8E1", color: "#8B6914", activeBorder: "#E8D48A" },
    { status: "out", label: "Kan inte", icon: X, bg: "#FDECEC", color: "hsl(var(--color-accent-red))", activeBorder: "#E8AAAA" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto w-full"
      style={{ maxWidth: 280 }}
    >
      <div
        className="p-3 space-y-2.5"
        style={{
          backgroundColor: "hsl(var(--color-surface-card))",
          border: "none",
          borderRadius: 8,
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "hsl(var(--color-surface-sage))" }}>
            <CalendarDays className="w-4 h-4" style={{ color: "hsl(var(--color-accent-sage-text))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium leading-snug" style={{ color: "hsl(var(--color-text-primary))" }}>
              {title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" style={{ color: "hsl(var(--color-text-secondary))" }} />
                <span className="text-[11px]" style={{ color: "hsl(var(--color-text-secondary))" }}>{dateText}</span>
              </div>
              {location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" style={{ color: "hsl(var(--color-text-secondary))" }} />
                  <span className="text-[11px]" style={{ color: "hsl(var(--color-text-secondary))" }}>{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status summary */}
        {rsvps.length > 0 && (
          <div className="text-[11px] leading-relaxed" style={{ color: "hsl(var(--color-text-secondary))" }}>
            {counts.in > 0 && (
              <span>
                {respondents.join(", ")} kan
                {counts.maybe > 0 && ` · ${counts.maybe} kanske`}
              </span>
            )}
            {counts.in === 0 && counts.maybe > 0 && (
              <span>{counts.maybe} kanske</span>
            )}
            {counts.in === 0 && counts.maybe === 0 && counts.out > 0 && (
              <span>Ingen har svarat ja ännu</span>
            )}
          </div>
        )}

        {/* Quick reply chips */}
        <div className="flex gap-1.5">
          {quickReplies.map((qr) => {
            const isActive = userRsvp?.status === qr.status;
            const Icon = qr.icon;
            return (
              <button
                key={qr.status}
                onClick={() => onRsvp(planId, qr.status)}
                disabled={!!userRsvp}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:cursor-default"
                style={{
                  backgroundColor: isActive ? qr.bg : (userRsvp ? "#F7F3EF" : qr.bg),
                  color: isActive ? qr.color : (userRsvp ? "#6B5C78" : qr.color),
                  border: "none",
                  opacity: userRsvp && !isActive ? 0.5 : 1,
                }}
              >
                <Icon className="w-3 h-3" />
                {qr.label}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: "hsl(var(--color-text-secondary))" }}>{creatorName}</span>
          <span className="text-[10px]" style={{ color: "hsl(var(--color-text-muted))" }}>
            {counts.in} av {members.length} · {time}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PlanTimelineCard;
