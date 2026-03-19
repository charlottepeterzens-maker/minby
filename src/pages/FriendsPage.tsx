import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, QrCode, MoreHorizontal, Heart } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import QRCodeSheet from "@/components/profile/QRCodeSheet";
import InviteFriendDialog from "@/components/profile/InviteFriendDialog";
import ConfirmSheet from "@/components/ConfirmSheet";

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
  tier: string;
}

interface PendingRequest {
  id: string;
  from_user_id: string;
  display_name: string;
  avatar_url: string | null;
  initial: string;
  created_at: string;
}

interface SearchResult {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  initial: string;
  status: "none" | "sent" | "friend";
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
  const [error, setError] = useState(false);
  
  const [qrOpen, setQrOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // People search state
  const [peopleSearch, setPeopleSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // Friend menu state
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [removeConfirm, setRemoveConfirm] = useState<{ userId: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(false);

    try {
      const [acceptedRes, pendingRes, tiersRes] = await Promise.all([
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
        supabase
          .from("friend_access_tiers")
          .select("friend_user_id, tier")
          .eq("owner_id", user.id),
      ]);

      if (acceptedRes.error) throw acceptedRes.error;
      if (pendingRes.error) throw pendingRes.error;

      const accepted = acceptedRes.data || [];
      const pending = pendingRes.data || [];
      const tiers = tiersRes.data || [];

      console.log("[FriendsPage] raw accepted friendships:", accepted);
      console.log("[FriendsPage] raw pending requests:", pending);

      // Build tier map
      const tierMap = new Map<string, string>();
      tiers.forEach((t) => tierMap.set(t.friend_user_id, t.tier));

      // Process pending requests
      if (pending.length) {
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

      // Process accepted friends — normalize both directions
      if (!accepted.length) {
        console.log("[FriendsPage] No accepted friendships found");
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

      console.log("[FriendsPage] mapped friend IDs:", friendIds);

      const today = format(new Date(), "yyyy-MM-dd");
      const [{ data: profiles }, { data: posts }, { data: hangouts }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", friendIds),
        supabase.from("life_posts").select("user_id, created_at").in("user_id", friendIds).order("created_at", { ascending: false }),
        supabase.from("hangout_availability").select("user_id, entry_type, date, activities, custom_note").in("user_id", friendIds).gte("date", today).order("date", { ascending: true }),
      ]);

      console.log("[FriendsPage] fetched profiles:", profiles);

      const latestPostMap = new Map<string, string>();
      posts?.forEach((p) => {
        if (!latestPostMap.has(p.user_id)) latestPostMap.set(p.user_id, p.created_at);
      });

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
        tier: tierMap.get(p.user_id) || "outer",
      }));

      list.sort((a, b) => {
        if (!a.last_activity && !b.last_activity) return 0;
        if (!a.last_activity) return 1;
        if (!b.last_activity) return -1;
        return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
      });

      setFriends(list);
    } catch (err) {
      console.error("[FriendsPage] Error fetching friends:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch muted users
  const fetchMutedUsers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("muted_users")
      .eq("user_id", user.id)
      .single();
    if (data?.muted_users) {
      setMutedUsers((data.muted_users as any) || []);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    fetchMutedUsers();
  }, [fetchData, fetchMutedUsers]);

  // Toggle close circle
  const handleToggleClose = async (friendUserId: string, currentTier: string) => {
    if (!user) return;
    const newTier = currentTier === "close" ? "outer" : "close";
    const { error } = await supabase
      .from("friend_access_tiers")
      .update({ tier: newTier as any })
      .eq("owner_id", user.id)
      .eq("friend_user_id", friendUserId);

    if (error) {
      toast.error("Kunde inte uppdatera");
    } else {
      setFriends((prev) =>
        prev.map((f) => f.user_id === friendUserId ? { ...f, tier: newTier } : f)
      );
      toast.success(newTier === "close" ? "Tillagd i närmaste krets" : "Borttagen från närmaste krets");
    }
    setMenuOpenFor(null);
  };

  // Remove friend handler
  const handleRemoveFriend = async (friendUserId: string) => {
    if (!user) return;
    await Promise.all([
      supabase.from("friend_access_tiers").delete().eq("owner_id", user.id).eq("friend_user_id", friendUserId),
      supabase.from("friend_access_tiers").delete().eq("owner_id", friendUserId).eq("friend_user_id", user.id),
    ]);
    await supabase
      .from("friend_requests")
      .delete()
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${friendUserId}),and(from_user_id.eq.${friendUserId},to_user_id.eq.${user.id})`)
      .eq("status", "accepted");
    setFriends((prev) => prev.filter((f) => f.user_id !== friendUserId));
    toast.success("Borttagen från din krets");
  };

  // Mute/unmute friend handler
  const handleToggleMute = async (friendUserId: string) => {
    if (!user) return;
    const isMuted = mutedUsers.includes(friendUserId);
    const updated = isMuted
      ? mutedUsers.filter((id) => id !== friendUserId)
      : [...mutedUsers, friendUserId];
    setMutedUsers(updated);
    await (supabase as any)
      .from("profiles")
      .update({ muted_users: updated })
      .eq("user_id", user.id);
    toast.success(isMuted ? "Avmutad" : "Mutad");
    setMenuOpenFor(null);
  };

  // People search
  useEffect(() => {
    if (!user || peopleSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const query = peopleSearch.trim();

      const { data: foundProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .ilike("display_name", `%${query}%`)
        .neq("user_id", user.id)
        .limit(10);

      if (!foundProfiles?.length) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      const foundIds = foundProfiles.map((p) => p.user_id);

      const { data: friendTiers } = await supabase
        .from("friend_access_tiers")
        .select("friend_user_id, owner_id")
        .or(`and(owner_id.eq.${user.id},friend_user_id.in.(${foundIds.join(",")})),and(owner_id.in.(${foundIds.join(",")}),friend_user_id.eq.${user.id})`);

      const friendSet = new Set<string>();
      friendTiers?.forEach((t) => {
        if (t.owner_id === user.id) friendSet.add(t.friend_user_id);
        else friendSet.add(t.owner_id);
      });

      const { data: pendingReqs } = await supabase
        .from("friend_requests")
        .select("from_user_id, to_user_id")
        .eq("status", "pending")
        .or(`and(from_user_id.eq.${user.id},to_user_id.in.(${foundIds.join(",")})),and(to_user_id.eq.${user.id},from_user_id.in.(${foundIds.join(",")}))`);

      const sentSet = new Set<string>();
      pendingReqs?.forEach((r) => {
        if (r.from_user_id === user.id) sentSet.add(r.to_user_id);
        else sentSet.add(r.from_user_id);
      });

      setSearchResults(
        foundProfiles.map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name || "Okänd",
          avatar_url: p.avatar_url,
          initial: (p.display_name || "?").charAt(0).toUpperCase(),
          status: friendSet.has(p.user_id) ? "friend" as const : sentSet.has(p.user_id) ? "sent" as const : "none" as const,
        }))
      );
      setSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [peopleSearch, user]);

  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!user) return;
    setSendingTo(targetUserId);

    const { error } = await supabase.from("friend_requests").insert({
      from_user_id: user.id,
      to_user_id: targetUserId,
    });

    if (error) {
      toast.error("Kunde inte skicka förfrågan");
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      await supabase.from("notifications").insert({
        user_id: targetUserId,
        from_user_id: user.id,
        type: "friend_request",
        title: "Vill vara med i din vardag",
        body: `${profile?.display_name || "Någon"} vill vara med i din vardag`,
      });

      toast.success("Skickat!");
      setSearchResults((prev) =>
        prev.map((r) => r.user_id === targetUserId ? { ...r, status: "sent" as const } : r)
      );
    }
    setSendingTo(null);
  };

  const handleAccept = async (requestId: string, fromUserId: string) => {
    if (!user) return;
    setRespondingId(requestId);
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) {
      toast.error("Kunde inte lägga till");
    } else {
      await supabase.from("friend_access_tiers").upsert([
        { owner_id: user.id, friend_user_id: fromUserId, tier: "outer" as const },
        { owner_id: fromUserId, friend_user_id: user.id, tier: "outer" as const },
      ], { onConflict: "owner_id,friend_user_id" });

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      await supabase.from("notifications").insert({
        user_id: fromUserId,
        from_user_id: user.id,
        type: "friend_accepted",
        title: "Nu i din krets!",
        body: `${profile?.display_name || "Någon"} är nu en del av din vardag`,
      });

      toast.success("Tillagd i din krets! 🎉");
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
      toast.error("Något gick fel");
    } else {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast("Förfrågan avvisad");
    }
    setRespondingId(null);
  };

  const filtered = friends.filter((f) =>
    f.display_name.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const closeFriends = filtered.filter((f) => f.tier === "close");
  const otherFriends = filtered.filter((f) => f.tier !== "close");

  const hasFriendsOrPending = friends.length > 0 || pendingRequests.length > 0;

  const renderFriendCard = (f: FriendRow) => {
    let statusText: string | null = null;
    if (f.hangout_status) {
      const h = f.hangout_status;
      const dateObj = new Date(h.date + "T00:00:00");
      const dateLabel = `${format(dateObj, "EEE", { locale: sv }).replace(".", "")} ${format(dateObj, "d/M")}`;
      if (h.entry_type === "confirmed") {
        statusText = `häng med ${dateLabel}`;
      } else if (h.entry_type === "activity") {
        const actName = h.activities.length > 0 ? h.activities[0] : "Aktivitet";
        statusText = `sugen på: ${actName} ${dateLabel}`;
      } else {
        statusText = `vill ses ${dateLabel}`;
      }
    } else if (f.last_activity) {
      statusText = `Lade upp något ${timeAgo(f.last_activity)}`;
    }
    const isMuted = mutedUsers.includes(f.user_id);
    const isClose = f.tier === "close";

    return (
      <div
        key={f.user_id}
        className="relative flex items-center gap-3 p-3 rounded-[16px] transition-colors hover:opacity-90"
        style={{
          backgroundColor: "#FFFFFF",
          border: isClose ? "1.5px solid #C9B8D8" : "1px solid #EDE8F4",
        }}
      >
        <button
          onClick={() => navigate(`/profile/${f.user_id}`)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: "#EDE8F4" }}>
            {f.avatar_url ? (
              <img src={f.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-sm font-display font-medium" style={{ color: "#3C2A4D" }}>{f.initial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-fraunces text-[13px] font-medium truncate" style={{ color: "#3C2A4D" }}>{f.display_name}</p>
            {isMuted && (
              <p className="text-[10px] mt-0.5" style={{ color: "#9B8BA5" }}>Mutad</p>
            )}
            {!isMuted && statusText && (
              <p className="text-[11px] truncate mt-0.5" style={{ color: "#9B8BA5" }}>{statusText}</p>
            )}
          </div>
        </button>

        {/* Three-dot menu */}
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === f.user_id ? null : f.user_id); }}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full"
        >
          <MoreHorizontal className="w-4 h-4" style={{ color: "#9B8BA5" }} />
        </button>

        {menuOpenFor === f.user_id && (
          <div
            className="absolute right-3 top-12 z-20 py-1 shadow-lg"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4", borderRadius: 6, minWidth: 200 }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleClose(f.user_id, f.tier); }}
              className="w-full text-left px-4 py-2.5 text-[13px] flex items-center gap-2"
              style={{ color: "#3C2A4D" }}
            >
              <Heart className="w-3.5 h-3.5" style={{ color: isClose ? "#C9B8D8" : "#9B8BA5" }} fill={isClose ? "#C9B8D8" : "none"} />
              {isClose ? "Ta bort från närmaste krets" : "Lägg till i närmaste krets"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleMute(f.user_id); }}
              className="w-full text-left px-4 py-2.5 text-[13px]"
              style={{ color: "#3C2A4D" }}
            >
              {isMuted ? `Sluta muta ${f.display_name}` : `Muta ${f.display_name}`}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpenFor(null); setRemoveConfirm({ userId: f.user_id, name: f.display_name }); }}
              className="w-full text-left px-4 py-2.5 text-[13px]"
              style={{ color: "#A32D2D" }}
            >
              Ta bort från kretsen
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#F7F3EF" }}>
      <nav className="sticky top-0 z-50 border-b" style={{ backgroundColor: "#F7F3EF", borderColor: "#EDE8F4" }}>
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="font-display text-[20px] font-medium" style={{ color: "#3C2A4D" }}>
            Min krets
          </span>
          <button
            onClick={() => setQrOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#EDE8F4" }}
          >
            <QrCode className="w-4.5 h-4.5" style={{ color: "#3C2A4D" }} strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-5 space-y-5">
        {/* People search */}
        <div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9B8BA5" }} strokeWidth={1.5} />
            <input
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              placeholder="Sök på namn..."
              className="w-full pl-10 pr-3 py-2.5 rounded-[10px] text-[13px] outline-none placeholder:text-[#9B8BA5] font-display"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4", color: "#3C2A4D" }}
            />
          </div>

          {/* Search results */}
          {peopleSearch.trim().length >= 2 && (
            <div className="mt-2 space-y-1.5">
              {searching ? (
                <p className="text-[12px] py-3 text-center" style={{ color: "#9B8BA5" }}>Söker...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-[12px] py-3 text-center" style={{ color: "#9B8BA5" }}>Inga resultat</p>
              ) : (
                searchResults.map((r) => (
                  <div
                    key={r.user_id}
                    className="flex items-center gap-3 p-3 rounded-[12px]"
                    style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4" }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                      style={{ backgroundColor: "#EDE8F4" }}
                    >
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-[12px] font-display font-medium" style={{ color: "#3C2A4D" }}>
                          {r.initial}
                        </span>
                      )}
                    </div>
                    <p className="flex-1 text-[13px] font-medium truncate" style={{ color: "#3C2A4D" }}>
                      {r.display_name}
                    </p>
                    {r.status === "friend" ? (
                      <span className="text-[11px]" style={{ color: "#9B8BA5" }}>I din krets</span>
                    ) : r.status === "sent" ? (
                      <span className="text-[11px]" style={{ color: "#9B8BA5" }}>Förfrågan skickad</span>
                    ) : (
                      <button
                        onClick={() => handleSendFriendRequest(r.user_id)}
                        disabled={sendingTo === r.user_id}
                        className="shrink-0 px-3 py-1.5 rounded-[20px] text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
                      >
                        Lägg till i min krets
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="space-y-3 w-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-[16px] h-[64px] animate-pulse" style={{ backgroundColor: "#EDE8F4" }} />
              ))}
            </div>
            <p className="text-[12px] mt-4" style={{ color: "#9B8BA5" }}>Laddar din krets…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="font-display text-[14px] font-medium mb-2" style={{ color: "#3C2A4D" }}>
              Vi kunde inte hämta din krets
            </p>
            <button
              onClick={() => fetchData()}
              className="px-4 py-1.5 rounded-[20px] text-[12px] font-medium"
              style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
            >
              Försök igen
            </button>
          </div>
        ) : !hasFriendsOrPending && peopleSearch.trim().length < 2 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: "#EDE8F4" }}>
              <Users className="w-7 h-7" style={{ color: "#3C2A4D" }} strokeWidth={1.5} />
            </div>
            <p className="font-display text-[16px] font-medium mb-1.5" style={{ color: "#3C2A4D" }}>
              Din krets väntar – bjud in dina närmaste
            </p>
            <p className="text-[13px] mb-6" style={{ color: "#9B8BA5" }}>
              Sök på namn eller skanna en QR-kod för att kopplas ihop
            </p>
            <InviteFriendDialog />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide mb-2 px-1" style={{ color: "#9B8BA5" }}>
                  Vänförfrågningar ({pendingRequests.length})
                </p>
                <div className="space-y-2">
                  {pendingRequests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-[12px]"
                      style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4" }}
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
                          className="px-3 py-1.5 rounded-[20px] text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ backgroundColor: "#3C2A4D", color: "#FFFFFF" }}
                        >
                          Acceptera
                        </button>
                        <button
                          onClick={() => handleDecline(r.id)}
                          disabled={respondingId === r.id}
                          className="px-3 py-1.5 rounded-[20px] text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ backgroundColor: "#F7F3EF", color: "#A32D2D" }}
                        >
                          Neka
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close circle section */}
            {friends.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide mb-2 px-1" style={{ color: "#9B8BA5" }}>
                  Din närmaste krets
                </p>
                {closeFriends.length === 0 ? (
                  <div
                    className="rounded-[12px] py-5 px-4 text-center"
                    style={{ backgroundColor: "#F5F0FA", border: "1px dashed #C9B8D8" }}
                  >
                    <Heart className="w-5 h-5 mx-auto mb-2" style={{ color: "#C9B8D8" }} />
                    <p className="text-[12px]" style={{ color: "#7A6A85" }}>
                      Lägg till några du vill ha lite extra nära
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: "#9B8BA5" }}>
                      Tryck ••• bredvid en vän för att lägga till
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {closeFriends.map(renderFriendCard)}
                  </div>
                )}
              </div>
            )}

            {/* Other friends */}
            {otherFriends.length > 0 && (
              <div>
                {closeFriends.length > 0 && (
                  <p className="text-[11px] font-medium uppercase tracking-wide mb-2 px-1" style={{ color: "#9B8BA5" }}>
                    Övriga vänner ({otherFriends.length})
                  </p>
                )}
                {closeFriends.length === 0 && pendingRequests.length > 0 && (
                  <p className="text-[11px] font-medium uppercase tracking-wide mb-2 px-1" style={{ color: "#9B8BA5" }}>
                    Dina vänner ({friends.length})
                  </p>
                )}

                {friends.length > 3 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9B8BA5" }} strokeWidth={1.5} />
                    <input
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      placeholder="Sök bland vänner..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-[10px] text-[13px] outline-none placeholder:text-[#9B8BA5]"
                      style={{ backgroundColor: "#FFFFFF", border: "1px solid #EDE8F4", color: "#3C2A4D" }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {otherFriends.length === 0 ? (
                    <p className="text-center py-8 text-[13px]" style={{ color: "#9B8BA5" }}>
                      Inga vänner matchar sökningen
                    </p>
                  ) : (
                    otherFriends.map(renderFriendCard)
                  )}

                  <div className="w-full flex items-center gap-3 p-3 rounded-[16px]" style={{ border: "1.5px dashed #EDE8F4", backgroundColor: "transparent" }}>
                    <InviteFriendDialog />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <QRCodeSheet open={qrOpen} onOpenChange={setQrOpen} />
      <ScrollToTopButton />
      <BottomNav />

      {/* Remove friend confirmation */}
      <ConfirmSheet
        open={!!removeConfirm}
        onOpenChange={(open) => { if (!open) setRemoveConfirm(null); }}
        title="Ta bort vän"
        description={`Vill du ta bort ${removeConfirm?.name || ""} från din krets? De kan inte längre se din vardag.`}
        confirmLabel="Ta bort"
        confirmStyle={{ backgroundColor: "#A32D2D" }}
        onConfirm={() => {
          if (removeConfirm) handleRemoveFriend(removeConfirm.userId);
          setRemoveConfirm(null);
        }}
      />
    </div>
  );
};

export default FriendsPage;
