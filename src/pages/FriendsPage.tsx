import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Users, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import ScrollToTopButton from "@/components/ScrollToTopButton";

interface HangoutStatus {
  entry_type: string;
  date: string;
  activities: string[];
  custom_note: string | null;
}

interface FriendRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  initial: string;
  last_activity: string | null;
  hangout_status: HangoutStatus | null;
}

interface PendingRequest {
  id: string;
  from_user_id: string;
  display_name: string;
  avatar_url: string | null;
  initial: string;
  created_at: string;
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
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch accepted friends + pending requests in parallel
    const [{ data: accepted }, { data: pending }] = await Promise.all([
      supabase
        .from("friend_requests")
        .select("from_user_id, to_user_id")
        .eq("status", "accepted")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`),
      supabase
        .from("friend_requests")
        .select("id, from_user_id, created_at")
        .eq("to_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    // Process pending requests
    if (pending?.length) {
      const pendingUserIds = pending.map((p) => p.from_user_id);
      const { data: pendingProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", pendingUserIds);

      const profileMap = new Map(
        (pendingProfiles || []).map((p) => [p.user_id, p])
      );

      setPendingRequests(
        pending.map((r) => {
          const p = profileMap.get(r.from_user_id);
          return {
            id: r.id,
            from_user_id: r.from_user_id,
            display_name: p?.display_name || "Okänd",
            avatar_url: p?.avatar_url || null,
            initial: (p?.display_name || "?").charAt(0).toUpperCase(),
            created_at: r.created_at,
          };
        })
      );
    } else {
      setPendingRequests([]);
    }

    // Process accepted friends
    if (!accepted?.length) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const friendIds = [
      ...new Set(
        accepted.map((r) =>
          r.from_user_id === user.id ? r.to_user_id : r.from_user_id
        )
      ),
    ];

    const today = format(new Date(), "yyyy-MM-dd");
    const [{ data: profiles }, { data: posts }, { data: hangouts }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", friendIds),
      supabase
        .from("life_posts")
        .select("user_id, created_at")
        .in("user_id", friendIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("hangout_availability")
        .select("user_id, entry_type, date, activities, custom_note")
        .in("user_id", friendIds)
        .gte("date", today)
        .order("date", { ascending: true }),
    ]);

    const latestPostMap = new Map<string, string>();
    posts?.forEach((p) => {
      if (!latestPostMap.has(p.user_id)) {
        latestPostMap.set(p.user_id, p.created_at);
      }
    });

    // Get nearest upcoming hangout per friend
    const hangoutMap = new Map<string, HangoutStatus>();
    hangouts?.forEach((h: any) => {
      if (!hangoutMap.has(h.user_id)) {
        hangoutMap.set(h.user_id, {
          entry_type: h.entry_type || "available",
          date: h.date,
          activities: h.activities || [],
          custom_note: h.custom_note,
        });
      }
    });

    const list: FriendRow[] = (profiles || []).map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name || "Okänd",
      avatar_url: p.avatar_url,
      initial: (p.display_name || "?").charAt(0).toUpperCase(),
      last_activity: latestPostMap.get(p.user_id) || null,
      hangout_status: hangoutMap.get(p.user_id) || null,
    }));

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
    fetchData();
  }, [fetchData]);

  const handleAccept = async (requestId: string, fromUserId: string) => {
    if (!user) return;
    setRespondingId(requestId);
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) {
      toast.error("Kunde inte acceptera förfrågan");
    } else {
      // Auto-assign outer tier
      await supabase.from("friend_access_tiers").upsert(
        { owner_id: user.id, friend_user_id: fromUserId, tier: "outer" as const },
        { onConflict: "owner_id,friend_user_id" }
      );
      toast.success("Vänförfrågan accepterad! 🎉");
      fetchData();
    }
    setRespondingId(null);
  };

  const handleDecline = async (requestId: string) => {
    setRespondingId(requestId);
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "declined" })
      .eq("id", requestId);

    if (error) {
      toast.error("Kunde inte avvisa förfrågan");
    } else {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast("Förfrågan avvisad");
    }
    setRespondingId(null);
  };

  const filtered = friends.filter((f) =>
    f.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const hasFriendsOrPending = friends.length > 0 || pendingRequests.length > 0;

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#F7F3EF" }}>
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
              <div key={i} className="rounded-[16px] h-[64px] animate-pulse" style={{ backgroundColor: "#EDE8F4" }} />
            ))}
          </div>
        ) : !hasFriendsOrPending ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: "#EDE8F4" }}>
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
          <div className="space-y-5">
            {/* Pending requests section */}
            {pendingRequests.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide mb-2 px-1" style={{ color: "#9B8BA5" }}>
                  Vänförfrågningar ({pendingRequests.length})
                </p>
                <div className="space-y-2">
                  {pendingRequests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-[16px]"
                      style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #EDE8F4" }}
                    >
                      <button
                        onClick={() => navigate(`/profile/${r.from_user_id}`)}
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ backgroundColor: "#EDE8F4" }}
                      >
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-display font-medium" style={{ color: "#3C2A4D" }}>
                            {r.initial}
                          </span>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: "#3C2A4D" }}>
                          {r.display_name}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: "#9B8BA5" }}>
                          Vill bli din vän
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAccept(r.id, r.from_user_id)}
                          disabled={respondingId === r.id}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ backgroundColor: "#EAF2E8" }}
                        >
                          <Check className="w-4 h-4" style={{ color: "#1F4A1A" }} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDecline(r.id)}
                          disabled={respondingId === r.id}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ backgroundColor: "#F5EDED" }}
                        >
                          <X className="w-4 h-4" style={{ color: "#A32D2D" }} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friend list */}
            {friends.length > 0 && (
              <div>
                {pendingRequests.length > 0 && (
                  <p className="text-[11px] font-medium uppercase tracking-wide mb-2 px-1" style={{ color: "#9B8BA5" }}>
                    Dina vänner ({friends.length})
                  </p>
                )}

                {/* Search */}
                {friends.length > 3 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9B8BA5" }} strokeWidth={1.5} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Sök bland vänner..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-[10px] text-[13px] outline-none placeholder:text-[#9B8BA5]"
                      style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #EDE8F4", color: "#3C2A4D" }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {filtered.length === 0 ? (
                    <p className="text-center py-8 text-[13px]" style={{ color: "#9B8BA5" }}>
                      Inga vänner matchar sökningen
                    </p>
                  ) : (
                    filtered.map((f) => {
                      // Build hangout status text
                      let statusText: string | null = null;
                      if (f.hangout_status) {
                        const h = f.hangout_status;
                        const dateObj = new Date(h.date + "T00:00:00");
                        const dateLabel = `${format(dateObj, "EEE", { locale: sv }).replace(".", "")} ${format(dateObj, "d/M")}`;
                        if (h.entry_type === "confirmed") {
                          statusText = `Plan ${dateLabel}`;
                        } else if (h.entry_type === "activity") {
                          const actName = h.activities.length > 0 ? h.activities[0] : "Aktivitet";
                          statusText = `Vill: ${actName} ${dateLabel}`;
                        } else {
                          statusText = `Ledig ${dateLabel}`;
                        }
                      } else if (f.last_activity) {
                        statusText = `Lade upp något ${timeAgo(f.last_activity)}`;
                      }
                      return (
                        <button
                          key={f.user_id}
                          onClick={() => navigate(`/profile/${f.user_id}`)}
                          className="w-full flex items-center gap-3 p-3 rounded-[16px] text-left transition-colors hover:opacity-90"
                          style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #EDE8F4" }}
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: "#EDE8F4" }}>
                            {f.avatar_url ? (
                              <img src={f.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-sm font-display font-medium" style={{ color: "#3C2A4D" }}>{f.initial}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate" style={{ color: "#3C2A4D" }}>{f.display_name}</p>
                            {statusText && (
                              <p className="text-[11px] truncate mt-0.5" style={{ color: "#9B8BA5" }}>{statusText}</p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}

                  {/* Invite row */}
                  <button
                    onClick={() => setInviteOpen(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-[16px] transition-colors hover:opacity-80"
                    style={{ border: "1.5px dashed #EDE8F4", backgroundColor: "transparent" }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#EDE8F4" }}>
                      <UserPlus className="w-4.5 h-4.5" style={{ color: "#3C2A4D" }} strokeWidth={1.5} />
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: "#3C2A4D" }}>Bjud in en vän</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <InviteDialogControlled open={inviteOpen} onOpenChange={setInviteOpen} />
      <ScrollToTopButton />
      <BottomNav />
    </div>
  );
};

const InviteDialogControlled = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
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
          <DialogTitle className="font-display text-base font-medium">Bjud in en vän</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#9B8BA5" }}>E-postadress</label>
            <Input type="email" placeholder="namn@exempel.se" value={email} onChange={(e) => setEmail(e.target.value)} className="text-sm" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#9B8BA5" }}>Personligt meddelande (valfritt)</label>
            <Textarea placeholder="Hej! Jag tror du skulle gilla Minby..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} rows={3} className="text-sm resize-none" />
          </div>
          <Button onClick={handleSend} disabled={sending || !email} className="w-full rounded-[10px] text-sm" style={{ backgroundColor: "#3C2A4D", color: "#FFFFFF" }}>
            {sending ? "Skickar..." : "Skicka inbjudan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsPage;
