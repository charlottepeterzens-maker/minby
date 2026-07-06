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
  id: string;
  entry_type: string;
  date: string;
  activities: string[];
  custom_note: string | null;
  user_id: string;
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
  avatar_url: string | null;
  member_names: string[];
  last_message: string | null;
  last_message_at: string | null;
  has_unread: boolean;
}

function statusLabel(entryType: string): string {
  if (entryType === "confirmed") return "häng med";
  if (entryType === "activity") return "sugen på";
  return "ledig";
}

function statusContent(f: FriendRow): string {
  if (f.hangout_status) {
    const h = f.hangout_status;
    if (h.custom_note) return h.custom_note;
    if (h.activities.length > 0) return h.activities[0];
    return "";
  }
  return "";
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
    if (days === 1) return "igår";
    if (days < 7) return `${days} dagar`;
    if (days < 30) return `${Math.floor(days / 7)} veckor`;
    return "";
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
          .select("id, user_id, entry_type, date, activities, custom_note")
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
            id: h.id,
            entry_type: h.entry_type || "available",
            date: h.date,
            activities: h.activities || [],
            custom_note: h.custom_note,
            user_id: h.user_id,
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
    const { data } = await (supabase as any).from("profile_settings").select("muted_users").eq("user_id", user.id).maybeSingle();
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
    await (supabase as any).from("profile_settings").update({ muted_users: updated }).eq("user_id", user.id);
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

  const availableToday = friends.filter((f) => f.hangout_status);
  const hasAnyContent = friends.length > 0 || groups.length > 0 || pendingRequests.length > 0;

  return (
    <PageTransition className="min-h-screen pb-24" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      {/* Header */}
      <nav className="sticky top-0 z-50 pt-safe" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
        <Container className="py-4 flex items-center justify-between">
          <span className="font-fraunces text-[22px] font-semibold" style={{ color: "hsl(var(--color-text-primary))" }}>
            Sällskap
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Sök"
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "hsl(var(--color-surface-card))" }}
            >
              <Search className="w-4 h-4" style={{ color: "hsl(var(--color-text-primary))" }} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setQrOpen(true)}
              aria-label="Visa QR-kod"
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "hsl(var(--color-surface-card))" }}
            >
              <QrCode className="w-4 h-4" style={{ color: "hsl(var(--color-text-primary))" }} strokeWidth={1.75} />
            </button>
          </div>
        </Container>
      </nav>

      <Container className="py-2 space-y-6">
        {/* Search panel */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
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
                          <span className="text-[11px]" style={{ color: "hsl(var(--color-text-muted))" }}>I din krets</span>
                        ) : r.status === "sent" ? (
                          <span className="text-[11px]" style={{ color: "hsl(var(--color-text-muted))" }}>Skickat</span>
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Din krets – story-rad med signaler */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-[12px]" style={{ color: "hsl(var(--color-text-muted))" }}>Laddar...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
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
          <section className="space-y-3">
            <h2 className="font-fraunces text-[17px] font-semibold px-1" style={{ color: "hsl(var(--color-text-primary))" }}>
              Din krets
            </h2>

            {friends.length === 0 ? (
              <div className="text-center py-6" style={{ backgroundColor: "hsl(var(--color-surface-card))", borderRadius: 8 }}>
                <p className="text-[13px] mb-3" style={{ color: "hsl(var(--color-text-muted))" }}>
                  Din krets väntar – bjud in dina närmaste
                </p>
                <InviteFriendDialog />
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
                {friends.map((f, i) => {
                  const isClose = f.tier === "close";
                  const isAvailable = !!f.hangout_status;
                  const hasActivity = hasRecentActivity(f.last_activity);

                  return (
                    <motion.button
                      key={f.user_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i, type: "spring", stiffness: 300, damping: 24 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setSelectedPerson(f)}
                      className="flex flex-col items-center gap-2 shrink-0"
                      style={{ width: 68 }}
                    >
                      <div className="relative">
                        <div
                          className="rounded-full"
                          style={{
                            padding: isAvailable ? 2 : 0,
                            border: isAvailable ? "2px solid #C4522A" : "none",
                          }}
                        >
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
                            style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
                          >
                            {resolveAvatarUrl(f.avatar_url) ? (
                              <img src={resolveAvatarUrl(f.avatar_url)!} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[15px] font-display font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                                {f.initial}
                              </span>
                            )}
                          </div>
                        </div>

                        {isClose && (
                          <div
                            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full"
                            style={{ width: 18, height: 18, backgroundColor: "hsl(var(--color-surface))", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="#C4522A">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          </div>
                        )}

                        {!isClose && !isAvailable && hasActivity && (
                          <div
                            className="absolute bottom-0 right-0 rounded-full"
                            style={{ width: 10, height: 10, backgroundColor: "#C4522A", border: "2px solid hsl(var(--color-surface))" }}
                          />
                        )}
                      </div>

                      <span className="text-[11px] font-medium truncate max-w-full" style={{ color: "hsl(var(--color-text-primary))" }}>
                        {f.display_name.split(" ")[0]}
                      </span>
                    </motion.button>
                  );
                })}

                {/* Bjud in */}
                <InviteFriendDialog
                  trigger={
                    <div className="flex flex-col items-center gap-2 shrink-0" style={{ width: 68 }}>
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "hsl(var(--color-surface-card))" }}
                      >
                        <Plus className="w-5 h-5" style={{ color: "hsl(var(--color-text-muted))" }} strokeWidth={1.5} />
                      </div>
                      <span className="text-[11px]" style={{ color: "hsl(var(--color-text-muted))" }}>Bjud in</span>
                    </div>
                  }
                />
              </div>
            )}
          </section>
        )}

        {/* Vänförfrågan-band */}
        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            {pendingRequests.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 * i, type: "spring", stiffness: 300, damping: 24 }}
                className="flex items-center gap-3 p-3"
                style={{ backgroundColor: "rgba(196,82,42,0.10)", borderRadius: 8 }}
              >
                <button
                  onClick={() => navigate(`/profile/${r.from_user_id}`)}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: "hsl(var(--color-surface))" }}
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
                    style={{ backgroundColor: "#561828", color: "#FFFFFF", borderRadius: 8 }}
                  >
                    Acceptera
                  </button>
                  <button
                    onClick={() => handleDecline(r.id)}
                    disabled={respondingId === r.id}
                    className="px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: "transparent", color: "hsl(var(--color-text-muted))", borderRadius: 8 }}
                  >
                    Neka
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Sugen på nåt? – tillgängliga idag */}
        {availableToday.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-fraunces text-[17px] font-semibold px-1" style={{ color: "hsl(var(--color-text-primary))" }}>
              Sugen på nåt?
            </h2>
            <div className="space-y-2">
              {availableToday.slice(0, 3).map((f, i) => {
                const content = statusContent(f);
                const label = statusLabel(f.hangout_status!.entry_type);
                return (
                  <motion.button
                    key={f.user_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, type: "spring", stiffness: 300, damping: 24 }}
                    onClick={() => setSelectedPerson(f)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                    style={{ backgroundColor: "hsl(var(--color-surface-card))", borderRadius: 8 }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                      style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
                    >
                      {resolveAvatarUrl(f.avatar_url) ? (
                        <img src={resolveAvatarUrl(f.avatar_url)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-display font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                          {f.initial}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "hsl(var(--color-text-primary))" }}>
                        {f.display_name.split(" ")[0]} är {label}
                      </p>
                      {content && (
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: "hsl(var(--color-text-muted))" }}>
                          {content}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider shrink-0 px-2 py-0.5"
                      style={{ color: "#C4522A", backgroundColor: "rgba(196,82,42,0.10)", borderRadius: 6 }}
                    >
                      Idag
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {/* Dina sällskap */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-fraunces text-[17px] font-semibold" style={{ color: "hsl(var(--color-text-primary))" }}>
              Dina sällskap
            </h2>
            <CreateGroupDialog
              onGroupCreated={fetchGroups}
              trigger={
                <button
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "#C4522A" }}
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
                  className="h-[68px] animate-pulse"
                  style={{ backgroundColor: "hsl(var(--color-surface-card))", borderRadius: 8 }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/groups/${g.id}`)}
                  className="w-full flex items-center gap-3 p-3 text-left transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: "hsl(var(--color-surface-card))", borderRadius: 8 }}
                >
                  {g.avatar_url ? (
                    <img
                      src={(() => {
                        const { data } = supabase.storage.from("group-avatars").getPublicUrl(g.avatar_url!);
                        return data?.publicUrl || "";
                      })()}
                      alt={g.name}
                      className="shrink-0 object-cover"
                      style={{ width: 44, height: 44, borderRadius: 8 }}
                    />
                  ) : (
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: "hsl(var(--color-surface-raised))" }}
                    >
                      <span className="text-lg">{g.emoji}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "hsl(var(--color-text-primary))" }}>
                        {g.name}
                      </p>
                      <span className="text-[10px] shrink-0" style={{ color: "hsl(var(--color-text-muted))" }}>
                        {g.last_message_at ? formatTime(g.last_message_at) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[12px] truncate" style={{ color: "hsl(var(--color-text-secondary))" }}>
                        {g.last_message || "Inga meddelanden än"}
                      </p>
                      {g.has_unread && (
                        <span
                          className="shrink-0 rounded-full"
                          style={{ width: 8, height: 8, backgroundColor: "#C4522A" }}
                        />
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {groups.length === 0 && (
                <div
                  className="p-5 text-center"
                  style={{ backgroundColor: "hsl(var(--color-surface-card))", borderRadius: 8 }}
                >
                  <p className="font-fraunces italic text-[14px] mb-1" style={{ color: "hsl(var(--color-text-primary))" }}>
                    Fler sällskap?
                  </p>
                  <p className="text-[11px] mb-3 leading-relaxed max-w-[240px] mx-auto" style={{ color: "hsl(var(--color-text-muted))" }}>
                    Samla dina närmaste för att enklare kunna ses i vardagen.
                  </p>
                  <CreateGroupDialog
                    onGroupCreated={fetchGroups}
                    trigger={
                      <span
                        className="text-[12px] font-semibold cursor-pointer underline underline-offset-4"
                        style={{ color: "#561828" }}
                      >
                        Skapa ett nytt sällskap
                      </span>
                    }
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {!loading && !hasAnyContent && (
          <div className="py-6 text-center">
            <p className="text-[12px]" style={{ color: "hsl(var(--color-text-muted))" }}>
              Bjud in någon för att komma igång.
            </p>
          </div>
        )}
      </Container>

      <QRCodeSheet open={qrOpen} onOpenChange={setQrOpen} />
      <ScrollToTopButton />
      <BottomNav />

      <KretspersonSheet
        open={!!selectedPerson}
        onOpenChange={(v) => { if (!v) setSelectedPerson(null); }}
        person={selectedPerson || { user_id: "", display_name: "", avatar_url: null, initial: "", tier: "outer", hangout_status: null, last_activity: null }}
        onUpdate={() => { fetchData(); setSelectedPerson(null); }}
        mutedUsers={mutedUsers}
        onToggleMute={(userId) => { handleToggleMute(userId); setSelectedPerson(null); }}
      />
    </PageTransition>
  );
};

export default FriendsPage;
