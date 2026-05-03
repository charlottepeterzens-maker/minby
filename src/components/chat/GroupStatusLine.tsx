interface GroupStatusLineProps {
  memberCount: number;
  latestPlan?: {
    title: string;
    dateText: string;
    rsvpInCount: number;
    rsvpMaybeCount: number;
  } | null;
  lastMessageAt?: string | null;
  compact?: boolean;
}

const GroupStatusLine = ({ memberCount, latestPlan, lastMessageAt, compact = false }: GroupStatusLineProps) => {
  let statusText = "";
  let statusColor = compact ? "hsl(var(--color-border-lavender))" : "hsl(var(--color-text-secondary))";

  if (latestPlan) {
    if (latestPlan.rsvpInCount > 0) {
      statusText = `${latestPlan.rsvpInCount} kan ${latestPlan.dateText.toLowerCase()}`;
      statusColor = compact ? "#B5CCBF" : "#7A5C14";
    } else if (latestPlan.rsvpMaybeCount > 0) {
      statusText = `${latestPlan.rsvpMaybeCount} kanske · ${latestPlan.title}`;
      statusColor = compact ? "hsl(var(--color-border-lavender))" : "hsl(var(--color-text-secondary))";
    } else {
      statusText = `Plan: ${latestPlan.title} – ingen har svarat`;
      statusColor = compact ? "hsl(var(--color-border-lavender))" : "hsl(var(--color-text-secondary))";
    }
  } else if (lastMessageAt) {
    const d = new Date(lastMessageAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) statusText = "Aktiv idag";
    else if (diffDays === 1) statusText = "Senast aktiv igår";
    else if (diffDays < 7) statusText = `Senast aktiv ${diffDays} dagar sedan`;
    else statusText = `${memberCount} medlemmar`;
  } else {
    statusText = `${memberCount} medlemmar`;
  }

  if (compact) {
    return (
      <span className="text-[10px]" style={{ color: statusColor }}>
        {statusText}
      </span>
    );
  }

  return (
    <p className="text-[11px] font-medium" style={{ color: statusColor }}>
      {statusText}
    </p>
  );
};

export default GroupStatusLine;
