import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Poll {
  id: string;
  question: string;
  options: string[];
  closed: boolean;
  closes_at: string | null;
  created_by: string;
  created_at: string;
  author_name: string;
  counts: number[];
  myVote: number | null;
}

/**
 * All poll business logic for a circle: fetch, realtime, vote and close.
 */
export const usePolls = (
  circleId: string | undefined,
  userId: string | undefined,
  nameFor: (id: string) => string,
) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!circleId) return;
    const { data: rows } = await supabase
      .from("polls")
      .select("id, question, options, closed, closes_at, created_by, created_at")
      .eq("circle_id", circleId)
      .order("created_at", { ascending: false });

    const list = rows ?? [];
    if (!list.length) {
      setPolls([]);
      setLoading(false);
      return;
    }

    const { data: votes } = await supabase
      .from("poll_votes")
      .select("poll_id, user_id, option_index")
      .in("poll_id", list.map((p) => p.id));

    setPolls(
      list.map((p) => {
        const opts = (p.options ?? []) as string[];
        const mine = (votes ?? []).find((v) => v.poll_id === p.id && v.user_id === userId);
        const counts = opts.map(
          (_, i) => (votes ?? []).filter((v) => v.poll_id === p.id && v.option_index === i).length,
        );
        return {
          ...p,
          options: opts,
          author_name: nameFor(p.created_by),
          counts,
          myVote: mine ? mine.option_index : null,
        } as Poll;
      }),
    );
    setLoading(false);
  }, [circleId, userId, nameFor]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime — refresh on any poll/vote change in this circle
  useEffect(() => {
    if (!circleId) return;
    const channel = supabase
      .channel(`polls-${circleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "polls", filter: `circle_id=eq.${circleId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId, load]);

  const createPoll = async ({
    question,
    options,
    closesAt,
  }: { question: string; options: string[]; closesAt: string | null }) => {
    if (!circleId || !userId) return;
    setCreating(true);
    const { error } = await supabase.from("polls").insert({
      circle_id: circleId,
      created_by: userId,
      question,
      options,
      closes_at: closesAt ? new Date(`${closesAt}T23:59:59`).toISOString() : null,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
    toast.success("Omröstningen är igång");
  };

  const vote = async (pollId: string, optionIndex: number) => {
    if (!userId) return;
    const prev = polls;
    // optimistic
    setPolls((cur) =>
      cur.map((p) => {
        if (p.id !== pollId) return p;
        const counts = [...p.counts];
        if (p.myVote !== null) counts[p.myVote] = Math.max(0, counts[p.myVote] - 1);
        if (p.myVote === optionIndex) return { ...p, counts, myVote: null };
        counts[optionIndex] += 1;
        return { ...p, counts, myVote: optionIndex };
      }),
    );

    const current = prev.find((p) => p.id === pollId);
    if (current?.myVote === optionIndex) {
      const { error } = await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", userId);
      if (error) { setPolls(prev); toast.error(error.message); }
      return;
    }
    if (current?.myVote !== null && current?.myVote !== undefined) {
      const { error } = await supabase
        .from("poll_votes")
        .update({ option_index: optionIndex })
        .eq("poll_id", pollId)
        .eq("user_id", userId);
      if (error) { setPolls(prev); toast.error(error.message); }
      return;
    }
    const { error } = await supabase
      .from("poll_votes")
      .insert({ poll_id: pollId, user_id: userId, option_index: optionIndex });
    if (error) { setPolls(prev); toast.error(error.message); }
  };

  const closePoll = async (pollId: string) => {
    const { error } = await supabase.from("polls").update({ closed: true }).eq("id", pollId);
    if (error) { toast.error(error.message); return; }
    setPolls((cur) => cur.map((p) => (p.id === pollId ? { ...p, closed: true } : p)));
  };

  return { polls, loading, creating, createPoll, vote, closePoll, reload: load };
};

export default usePolls;
