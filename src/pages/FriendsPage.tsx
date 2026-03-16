import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import InviteFriendDialog from "@/components/profile/InviteFriendDialog";

interface FriendRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  initial: string;
  last_activity: string | null;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just nu";
  if (mins < 60) return `${mins} min sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 dag sedan";
  if (days < 30) return `${days} dagar sedan`;
  return "";
}

const FriendsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get accepted friend requests (both directions)
    const { data: requests } = await supabase
      .from("friend_requests")
      .select("from_user_id, to_user_id")
      .eq("status", "accepted")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

    if (!requests?.length) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const friendIds = [
      ...new Set(
        requests.map((r) =>
          r.from_user_id === user.id ? r.to_user_id : r.from_user_id
        )
      ),
    ];

    // Fetch profiles and latest activity in parallel
    const [{ data: profiles }, { data: posts }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", friendIds),
      supabase
        .from("life_posts")
        .select("user_id, created_at")
        .in("user_id", friendIds)
        .order("created_at", { ascending: false }),
    ]);

    // Build a map of latest post per user
    const latestPostMap = new Map<string, string>();
    posts?.forEach((p) => {
      if (!latestPostMap.has(p.user_id)) {
        latestPostMap.set(p.user_id, p.created_at);
      }
    });

    const list: FriendRow[] = (profiles || []).map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name || "Okänd",
      avatar_url: p.avatar_url,
      initial: (p.display_name || "?").charAt(0).toUpperCase(),
      last_activity: latestPostMap.get(p.user_id) || null,
    }));

    // Sort: recently active first
    list.sort((a, b) => {
      if (!a.last_activity && !b.last_activity) return 0;
      if (!a.last_activity) return 1;
      if (!b.last_activity) return -1;
      return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
    });

    setFriends(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#F7F3EF" }}>
      {/* Header */}
      <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: "#F7F3EF", borderColor: "#EDE8F4" }}>
        <div className="max-w-2xl mx-auto px-5 py-4">
          <span className="font-display text-[20px] font-medium" style={{ color: "#3C2A4D" }}>
            Vänner
          </span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-[16px] h-[64px] animate-pulse"
                style={{ backgroundColor: "#EDE8F4" }}
              />
            ))}
          </div>
        ) : friends.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ backgroundColor: "#EDE8F4" }}
            >
              <Users className="w-7 h-7" style={{ color: "#3C2A4D" }} strokeWidth={1.5} />
            </div>
            <p className="font-display text-[16px] font-medium mb-1.5" style={{ color: "#3C2A4D" }}>
              Din by är tom ännu
            </p>
            <p className="text-[13px] mb-6" style={{ color: "#9B8BA5" }}>
              Bjud in dina närmaste så börjar byn leva
            </p>
            <Button
              onClick={() => setInviteOpen(true)}
              className="rounded-[10px] text-sm font-medium px-6"
              style={{ backgroundColor: "#3C2A4D", color: "#FFFFFF" }}
            >
              Bjud in en vän
            </Button>
          </div>
        ) : (
          /* Friend list */
          <div className="space-y-2">
            {friends.map((f) => {
              const activityText = f.last_activity
                ? `Lade upp något ${timeAgo(f.last_activity)}`
                : null;

              return (
                <button
                  key={f.user_id}
                  onClick={() => navigate(`/profile/${f.user_id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-[16px] text-left transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "0.5px solid #EDE8F4",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: "#EDE8F4" }}
                  >
                    {f.avatar_url ? (
                      <img
                        src={f.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-sm font-display font-medium"
                        style={{ color: "#3C2A4D" }}
                      >
                        {f.initial}
                      </span>
                    )}
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-medium truncate"
                      style={{ color: "#3C2A4D" }}
                    >
                      {f.display_name}
                    </p>
                    {activityText && (
                      <p className="text-[11px] truncate mt-0.5" style={{ color: "#9B8BA5" }}>
                        {activityText}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Invite row */}
            <button
              onClick={() => setInviteOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-[16px] transition-colors hover:opacity-80"
              style={{
                border: "1.5px dashed #EDE8F4",
                backgroundColor: "transparent",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#EDE8F4" }}
              >
                <UserPlus className="w-4.5 h-4.5" style={{ color: "#3C2A4D" }} strokeWidth={1.5} />
              </div>
              <span className="text-[13px] font-medium" style={{ color: "#3C2A4D" }}>
                Bjud in en vän
              </span>
            </button>
          </div>
        )}
      </main>

      {/* Reuse InviteFriendDialog in controlled mode */}
      <InviteDialogControlled open={inviteOpen} onOpenChange={setInviteOpen} />

      <ScrollToTopButton />
      <BottomNav />
    </div>
  );
};

/* Wrapper to control InviteFriendDialog externally */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const InviteDialogControlled = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Ange en giltig e-postadress");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: { email: email.trim(), message: message.trim() },
      });
      if (error) throw error;
      if (data?.error === "already_registered") {
        toast.info(data.message);
      } else {
        toast.success("Inbjudan skickad! 🎉");
        setEmail("");
        setMessage("");
        onOpenChange(false);
      }
    } catch {
      toast.error("Kunde inte skicka inbjudan. Försök igen.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[14px] max-w-sm" style={{ border: "0.5px solid #EDE8F4" }}>
        <DialogHeader>
          <DialogTitle className="font-display text-base font-medium">
            Bjud in en vän
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#9B8BA5" }}>
              E-postadress
            </label>
            <Input
              type="email"
              placeholder="namn@exempel.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#9B8BA5" }}>
              Personligt meddelande (valfritt)
            </label>
            <Textarea
              placeholder="Hej! Jag tror du skulle gilla Minby..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={sending || !email}
            className="w-full rounded-[10px] text-sm"
            style={{ backgroundColor: "#3C2A4D", color: "#FFFFFF" }}
          >
            {sending ? "Skickar..." : "Skicka inbjudan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsPage;
