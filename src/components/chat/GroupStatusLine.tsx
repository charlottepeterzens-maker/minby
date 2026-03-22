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
  let statusColor = "#7A6A85";

  if (latestPlan) {
    if (latestPlan.rsvpInCount > 0) {
      statusText = `${latestPlan.rsvpInCount} kan ${latestPlan.dateText.toLowerCase()}`;
      statusColor = "#1F4A1A";
    } else if (latestPlan.rsvpMaybeCount > 0) {
      statusText = `${latestPlan.rsvpMaybeCount} kanske · ${latestPlan.title}`;
    } else {
      statusText = `Plan: ${latestPlan.title} – ingen har svarat`;
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
