import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Search, QrCode, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveAvatarUrl } from "@/utils/avatarUrl";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import QRCodeSheet from "@/components/profile/QRCodeSheet";
import InviteFriendDialog from "@/components/profile/InviteFriendDialog";
import KretspersonSheet from "@/components/profile/KretspersonSheet";
import { Container } from "@/components/layout";
import CreateGroupDialog from "@/components/CreateGroupDialog";

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

interface GroupRow {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
  member_names: string[];
  last_message: string | null;
  last_message_at: string | null;
  has_unread: boolean;
}

function statusText(f: FriendRow): string {
  if (f.hangout_status) {
    const h = f.hangout_status;
    if (h.custom_note) return h.custom_note;
    if (h.activities.length > 0) return h.activities[0];
    return h.entry_type === "confirmed" ? "häng med" : "ledig";
  }
  if (f.last_activity) {
    const days = Math.floor((Date.now() - new Date(f.last_activity).getTime()) / 86400000);
    if (days === 0) return "aktiv idag";
    if (days === 1) return "1 d sedan";
    if (days < 30) return `${days} d sedan`;
    return "länge sedan";
  }
  return "";
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Igår";
  if (diffDays < 7) return d.toLocaleDateString("sv-SE", { weekday: "short" });
  return d.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
}

function hasRecentActivity(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) < 86400000;
}

const FriendsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // Person sheet
  const [selectedPerson, setSelectedPerson] = useState<FriendRow | null>(null);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);

  // Groups state
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

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
        supabase.from("friend_access_tiers").select("friend_user_id, tier").eq("owner_id", user.id),
      ]);

      if (acceptedRes.error) throw acceptedRes.error;
      if (pendingRes.error) throw pendingRes.error;

      const accepted = acceptedRes.data || [];
      const pending = pendingRes.data || [];
      const tiers = tiersRes.data || [];

      const tierMap = new Map<string, string>();
      tiers.forEach((t) => tierMap.set(t.friend_user_id, t.tier));

      if (pending.length) {
        const pendingUserIds = pending.map((p) => p.from_user_id);
        const { data: pendingProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", pendingUserIds);

        const profileMap = new Map((pendingProfiles || []).map((p) => [p.user_id, p]));

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
          }),
        );
      } else {
        setPendingRequests([]);
      }

      if (!accepted.length) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const friendIds = [...new Set(accepted.map((r) => (r.from_user_id === user.id ? r.to_user_id : r.from_user_id)))];

      const today = format(new Date(), "yyyy-MM-dd");
      const [{ data: profiles }, { data: posts }, { data: hangouts }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", friendIds),
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

      // Sort: close first, then by latest activity
      list.sort((a, b) => {
        const aClose = a.tier === "close" ? 0 : 1;
        const bClose = b.tier === "close" ? 0 : 1;
        if (aClose !== bClose) return aClose - bClose;
        if (!a.last_activity && !b.last_activity) return 0;
        if (!a.last_activity) return 1;
        if (!b.last_activity) return -1;
        return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
      });

      setFriends(list);
    } catch (err) {
      console.error("[FriendsPage] Error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMutedUsers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("muted_users").eq("user_id", user.id).single();
    if (data?.muted_users) {
      setMutedUsers((data.muted_users as any) || []);
    }
  }, [user]);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setGroupsLoading(true);
    try {
      const { data: memberships } = await supabase
        .from("group_memberships")
        .select("group_id, joined_at")
        .eq("user_id", user.id);

      if (!memberships?.length) {
        setGroups([]);
        setGroupsLoading(false);
        return;
      }

      const groupIds = memberships.map((m) => m.group_id);
      const joinedAtMap = new Map(memberships.map((m) => [m.group_id, m.joined_at]));

      const { data: groupsData } = await supabase.from("friend_groups").select("*").in("id", groupIds);

      if (!groupsData) {
        setGroups([]);
        setGroupsLoading(false);
        return;
      }

      const groupsWithMembers: GroupRow[] = await Promise.all(
        groupsData.map(async (g) => {
          const [{ data: members }, { data: lastMsg }] = await Promise.all([
            supabase.from("group_memberships").select("user_id").eq("group_id", g.id),
            supabase
              .from("group_messages")
              .select("content, created_at, user_id")
              .eq("group_id", g.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          const memberIds = (members || []).map((m) => m.user_id);
          const { data: profiles } = await supabase.from("profiles").select("display_name").in("user_id", memberIds);
          const names = (profiles || []).map((p) => p.display_name || "Anonym").slice(0, 4);

          const hasUnread = !!(
            lastMsg?.created_at &&
            lastMsg.user_id !== user.id &&
            new Date(lastMsg.created_at) > new Date(joinedAtMap.get(g.id) || 0)
          );

          return {
            ...g,
            member_names: names,
            last_message: lastMsg?.content || null,
            last_message_at: lastMsg?.created_at || null,
            has_unread: hasUnread,
          };
        }),
      );

      groupsWithMembers.sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });

      setGroups(groupsWithMembers);
    } catch {
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    fetchMutedUsers();
    fetchGroups();
  }, [fetchData, fetchMutedUsers, fetchGroups]);

  const handleToggleMute = async (friendUserId: string) => {
    if (!user) return;
    const isMuted = mutedUsers.includes(friendUserId);
    const updated = isMuted ? mutedUsers.filter((id) => id !== friendUserId) : [...mutedUsers, friendUserId];
    setMutedUsers(updated);
    await (supabase as any).from("profiles").update({ muted_users: updated }).eq("user_id", user.id);
    toast.success(isMuted ? "Avmutad" : "Mutad");
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
        .or(
          `and(owner_id.eq.${user.id},friend_user_id.in.(${foundIds.join(",")})),and(owner_id.in.(${foundIds.join(",")}),friend_user_id.eq.${user.id})`,
        );

      const friendSet = new Set<string>();
      friendTiers?.forEach((t) => {
        if (t.owner_id === user.id) friendSet.add(t.friend_user_id);
        else friendSet.add(t.owner_id);
      });

      const { data: pendingReqs } = await supabase
        .from("friend_requests")
        .select("from_user_id, to_user_id")
        .eq("status", "pending")
        .or(
          `and(from_user_id.eq.${user.id},to_user_id.in.(${foundIds.join(",")})),and(to_user_id.eq.${user.id},from_user_id.in.(${foundIds.join(",")}))`,
        );

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
          status: friendSet.has(p.user_id)
            ? ("friend" as const)
            : sentSet.has(p.user_id)
              ? ("sent" as const)
              : ("none" as const),
        })),
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
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();

      await supabase.from("notifications").insert({
        user_id: targetUserId,
        from_user_id: user.id,
        type: "friend_request",
        title: "Vill vara med i din vardag",
        body: `${profile?.display_name || "Någon"} vill vara med i din vardag`,
      });

      toast.success("Skickat!");
      setSearchResults((prev) => prev.map((r) => (r.user_id === targetUserId ? { ...r, status: "sent" as const } : r)));
    }
    setSendingTo(null);
  };

  const handleAccept = async (requestId: string, fromUserId: string) => {
    if (!user) return;
    setRespondingId(requestId);
    const { error } = await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);

    if (error) {
      toast.error("Kunde inte lägga till");
    } else {
      await supabase.from("friend_access_tiers").upsert(
        [
          { owner_id: user.id, friend_user_id: fromUserId, tier: "outer" as const },
          { owner_id: fromUserId, friend_user_id: user.id, tier: "outer" as const },
        ],
        { onConflict: "owner_id,friend_user_id" },
      );

      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();

      await supabase.from("notifications").insert({
        user_id: fromUserId,
        from_user_id: user.id,
        type: "friend_accepted",
        title: "Nu i din krets!",
        body: `${profile?.display_name || "Någon"} är nu en del av din vardag`,
      });

      toast.success("Tillagd i din krets");
      fetchData();
    }
    setRespondingId(null);
  };

  const handleDecline = async (requestId: string) => {
    setRespondingId(requestId);
    const { error } = await supabase.from("friend_requests").update({ status: "declined" }).eq("id", requestId);

    if (error) {
      toast.error("Något gick fel");
    } else {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast("Inte nu");
    }
    setRespondingId(null);
  };

  return (
    <PageTransition className="min-h-screen pb-20" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      {/* Header */}
      <nav className="sticky top-0 z-50" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
        <Container className="py-4 flex items-center justify-between">
          <span className="font-display text-[20px] font-medium" style={{ color: "hsl(var(--color-text-primary))", fontFamily: "Georgia, serif" }}>
            Sällskap
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Sök"
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
            >
              <Search className="w-4.5 h-4.5" style={{ color: "hsl(var(--color-text-primary))" }} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setQrOpen(true)}
              aria-label="Visa QR-kod"
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
            >
              <QrCode className="w-4.5 h-4.5" style={{ color: "hsl(var(--color-text-primary))" }} strokeWidth={1.5} />
            </button>
          </div>
        </Container>
      </nav>

      <Container className="py-2 space-y-5">
        {/* Search panel */}
        {searchOpen && (
          <div>
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "hsl(var(--color-text-muted))" }}
                strokeWidth={1.5}
              />
              <input
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                placeholder="Sök på namn..."
                autoFocus
                className="w-full pl-10 pr-3 py-2.5 text-[13px] outline-none placeholder:text-[#6B5C78] font-display"
                style={{ backgroundColor: "hsl(var(--color-surface-card))", border: "none", borderRadius: 8, color: "hsl(var(--color-text-primary))" }}
              />
            </div>

            {peopleSearch.trim().length >= 2 && (
              <div className="mt-2 space-y-1.5">
                {searching ? (
                  <p className="text-[12px] py-3 text-center" style={{ color: "hsl(var(--color-text-muted))" }}>
                    Söker...
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="text-[12px] py-3 text-center" style={{ color: "hsl(var(--color-text-muted))" }}>
                    Inga resultat
                  </p>
                ) : (
                  searchResults.map((r) => (
                    <div
                      key={r.user_id}
                      className="flex items-center gap-3 p-3"
                      style={{ backgroundColor: "hsl(var(--color-surface-card))", borderRadius: 8 }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
                      >
                        {resolveAvatarUrl(r.avatar_url) ? (
                          <img src={resolveAvatarUrl(r.avatar_url)!} alt="" loading="lazy" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-[12px] font-display font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                            {r.initial}
                          </span>
                        )}
                      </div>
                      <p className="flex-1 text-[13px] font-medium truncate" style={{ color: "hsl(var(--color-text-primary))" }}>
                        {r.display_name}
                      </p>
                      {r.status === "friend" ? (
                        <span className="text-[11px]" style={{ color: "hsl(var(--color-text-muted))" }}>
                          I din krets
                        </span>
                      ) : r.status === "sent" ? (
                        <span className="text-[11px]" style={{ color: "hsl(var(--color-text-muted))" }}>
                          Skickat
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(r.user_id)}
                          disabled={sendingTo === r.user_id}
                          className="shrink-0 px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ backgroundColor: "hsl(var(--color-surface-raised))", color: "hsl(var(--color-text-primary))", borderRadius: 8 }}
                        >
                          Bjud in
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Pending friend requests – on top */}
        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            {pendingRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3"
                style={{ backgroundColor: "#EDE8F4", border: "1px solid #C9B8D8", borderRadius: 8 }}
              >
                <button
                  onClick={() => navigate(`/profile/${r.from_user_id}`)}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
                >
                  {resolveAvatarUrl(r.avatar_url) ? (
                    <img src={resolveAvatarUrl(r.avatar_url)!} alt="" loading="lazy" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-display font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                      {r.initial}
                    </span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--color-text-primary))" }}>
                    {r.display_name}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--color-text-muted))" }}>
                    Vill vara med i din vardag
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleAccept(r.id, r.from_user_id)}
                    disabled={respondingId === r.id}
                    className="px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: "#3C2A4D", color: "#FFFFFF", borderRadius: 8 }}
                  >
                    Acceptera
                  </button>
                  <button
                    onClick={() => handleDecline(r.id)}
                    disabled={respondingId === r.id}
                    className="px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: "transparent", color: "#A32D2D", borderRadius: 8 }}
                  >
                    Neka
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section 1: Din krets */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <p className="text-[12px]" style={{ color: "hsl(var(--color-text-muted))" }}>Laddar...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="font-display text-[14px] font-medium mb-2" style={{ color: "hsl(var(--color-text-primary))" }}>
              Vi kunde inte hämta din krets
            </p>
            <button
              onClick={() => fetchData()}
              className="px-4 py-1.5 text-[12px] font-medium"
              style={{ backgroundColor: "hsl(var(--color-surface-raised))", color: "hsl(var(--color-text-primary))", borderRadius: 8 }}
            >
              Försök igen
            </button>
          </div>
        ) : (
          <div>
            <p
              className="text-[11px] font-medium uppercase mb-3 px-1"
              style={{ color: "#B0A8B5", letterSpacing: "0.07em" }}
            >
              Din krets
            </p>

            {friends.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[13px] mb-3" style={{ color: "hsl(var(--color-text-muted))" }}>
                  Din krets väntar – bjud in dina närmaste
                </p>
                <InviteFriendDialog />
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2" style={{ scrollbarWidth: "none" }}>
                {friends.map((f) => {
                  const isClose = f.tier === "close";
                  const hasActivity = hasRecentActivity(f.last_activity);
                  const status = statusText(f);

                    return (
                      <motion.button
                        key={f.user_id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 * friends.indexOf(f), type: "spring", stiffness: 300, damping: 24 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setSelectedPerson(f)}
                        className="flex flex-col items-center shrink-0"
                        style={{ width: 64 }}
                      >
                        <div className="relative mb-1">
                          <motion.div
                            whileHover={{ scale: 1.08 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className="w-[44px] h-[44px] rounded-full flex items-center justify-center overflow-hidden"
                            style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
                          >
                            {resolveAvatarUrl(f.avatar_url) ? (
                              <img src={resolveAvatarUrl(f.avatar_url)!} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-sm font-display font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                                {f.initial}
                              </span>
                            )}
                          </motion.div>
                          {hasActivity && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.2 + 0.04 * friends.indexOf(f) }}
                              className="absolute bottom-0 right-0 w-[11px] h-[11px] rounded-full"
                              style={{ backgroundColor: "#C9503A", border: "2px solid #F7F3EF" }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 max-w-full">
                          <span className="text-[11px] truncate" style={{ color: "hsl(var(--color-text-primary))" }}>
                            {f.display_name.split(" ")[0]}
                          </span>
                          {isClose && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="#C9B8D8" className="shrink-0">
                              <path d="M4 7L1.17 4.17a2 2 0 112.83-2.83L4 1.34l.17-.17a2 2 0 012.83 2.83L4 7z" />
                            </svg>
                          )}
                        </div>
                        {status && (
                          <span className="text-[10px] truncate max-w-full" style={{ color: "#B0A8B5" }}>
                            {status}
                          </span>
                        )}
                      </motion.button>
                    );
                })}

                {/* Invite + avatar */}
                <InviteFriendDialog
                  trigger={
                    <div className="flex flex-col items-center shrink-0" style={{ width: 64 }}>
                      <div
                        className="w-[44px] h-[44px] rounded-full flex items-center justify-center mb-1"
                        style={{ border: "1.5px dashed #C9B8D8" }}
                      >
                        <Plus className="w-4 h-4" style={{ color: "#C9B8D8" }} />
                      </div>
                      <span className="text-[10px]" style={{ color: "#B0A8B5" }}>Bjud in</span>
                    </div>
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Section 2: Dina sällskap */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p
              className="text-[11px] font-medium uppercase"
              style={{ color: "#B0A8B5", letterSpacing: "0.07em" }}
            >
              Dina sällskap
            </p>
            <CreateGroupDialog
              onGroupCreated={fetchGroups}
              trigger={
                <button
                  className="px-3 py-1 text-[11px] font-medium text-white"
                  style={{ backgroundColor: "#3C2A4D", borderRadius: 99 }}
                >
                  + Nytt
                </button>
              }
            />
          </div>

          {groupsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[64px] animate-pulse"
                  style={{ backgroundColor: "hsl(var(--color-surface-raised))", borderRadius: 8 }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/groups/${g.id}`)}
                  className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: "hsl(var(--color-surface-card))",
                    borderRadius: 8,
                    borderLeft: g.has_unread ? "3px solid #3C2A4D" : "3px solid transparent",
                  }}
                >
                  <div
                    className="shrink-0 flex items-center justify-center"
                    style={{ width: 42, height: 42, borderRadius: 8, backgroundColor: "hsl(var(--color-surface))" }}
                  >
                    <span className="text-lg">{g.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--color-text-primary))" }}>
                      {g.name}
                    </p>
                    <p className="text-[11px] truncate italic" style={{ color: "hsl(var(--color-text-secondary))" }}>
                      {g.last_message || "Inga meddelanden än"}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px]" style={{ color: "hsl(var(--color-text-secondary))" }}>
                      {g.last_message_at ? formatTime(g.last_message_at) : "–"}
                    </span>
                    {g.has_unread && (
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#C9503A" }} />
                    )}
                  </div>
                </button>
              ))}

              {groups.length < 2 && (
                <div
                  className="p-4 text-center"
                  style={{ border: "1.5px dashed #C9B8D8", borderRadius: 8 }}
                >
                  <p className="text-[13px] mb-1" style={{ color: "hsl(var(--color-text-secondary))" }}>
                    Har ni en gruppchatt som planerar saker?
                  </p>
                  <CreateGroupDialog
                    onGroupCreated={fetchGroups}
                    trigger={
                      <span className="text-[13px] font-medium cursor-pointer" style={{ color: "#3C2A4D" }}>
                        Starta ett sällskap med din krets →
                      </span>
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Container>

      <QRCodeSheet open={qrOpen} onOpenChange={setQrOpen} />
      <ScrollToTopButton />
      <BottomNav />

      {selectedPerson && (
        <KretspersonSheet
          open={!!selectedPerson}
          onOpenChange={(v) => { if (!v) setSelectedPerson(null); }}
          person={selectedPerson}
          onUpdate={() => { fetchData(); setSelectedPerson(null); }}
          mutedUsers={mutedUsers}
          onToggleMute={(userId) => { handleToggleMute(userId); setSelectedPerson(null); }}
        />
      )}
    </PageTransition>
  );
};

export default FriendsPage;
