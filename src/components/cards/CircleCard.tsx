import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  circleId: string;
  name: string;
  onOpen: () => void;
}

interface Member {
  user_id: string;
  avatar_url: string | null;
  display_name: string | null;
}

const CircleCard = ({ circleId, name, onOpen }: Props) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("circle_ai_summary")
        .select("content")
        .eq("circle_id", circleId)
        .maybeSingle();
      setSummary(s?.content ?? null);

      const { data: cm } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", circleId);
      const ids = (cm ?? []).map((m) => m.user_id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, avatar_url, display_name")
          .in("user_id", ids);
        setMembers(profs ?? []);
      }
    })();
  }, [circleId]);

  const visible = members.slice(0, 3);
  const extra = Math.max(0, members.length - visible.length);

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-[28px] p-5 flex gap-4"
      style={{ backgroundColor: "#F9F3E1" }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] mb-2"
          style={{ fontFamily: "'Outfit', sans-serif", color: "#561828" }}
        >
          {name}
        </div>
        <p
          className="text-[15px] leading-snug line-clamp-4 mb-3"
          style={{ color: "#2B2B2B" }}
        >
          {summary ?? "Här samlas kretsen. Öppna för att se vad som händer."}
        </p>
          <span
            className="text-button underline underline-offset-2 decoration-1"
            style={{ color: "#2B2B2B", textDecorationColor: "#C85A2E" }}
          >
            Kika in!
          </span>

      </div>

      <div className="flex-shrink-0 w-[92px] relative h-[92px]">
        {visible[0] && (
          <Avatar src={visible[0].avatar_url} name={visible[0].display_name} className="absolute top-0 right-0 w-12 h-12" />
        )}
        {visible[1] && (
          <Avatar src={visible[1].avatar_url} name={visible[1].display_name} className="absolute top-8 left-0 w-11 h-11" />
        )}
        {visible[2] && (
          <Avatar src={visible[2].avatar_url} name={visible[2].display_name} className="absolute bottom-0 right-2 w-10 h-10" />
        )}
        {extra > 0 && (
          <div
            className="absolute bottom-0 right-2 w-10 h-10 rounded-[32%] flex items-center justify-center text-[13px] font-medium"
            style={{ backgroundColor: "#DCEAF8", color: "#2B2B2B" }}
          >
            +{extra}
          </div>
        )}
      </div>
    </button>
  );
};

const Avatar = ({ src, name, className }: { src: string | null; name: string | null; className?: string }) => {
  const initials = (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={`rounded-[32%] overflow-hidden flex items-center justify-center text-xs ${className ?? ""}`}
      style={{ backgroundColor: "#DCEAF8", color: "#2B2B2B" }}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default CircleCard;
