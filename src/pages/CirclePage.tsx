import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Circle { id: string; name: string; hero_image_url: string | null; created_by: string; }

const CirclePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("circles").select("*").eq("id", id).maybeSingle();
      setCircle(data as Circle | null);
      const { count } = await supabase.from("circle_members").select("*", { count: "exact", head: true }).eq("circle_id", id);
      setMemberCount(count ?? 0);
    })();
  }, [id]);

  const invite = async () => {
    if (!id || !user) return;
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("circle_invites").insert({
      token, circle_id: id, created_by: user.id,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    const url = `${window.location.origin}/invite/${token}`;
    if (navigator.share) {
      try { await navigator.share({ title: circle?.name ?? "Krets", url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Länken är kopierad");
    }
  };

  if (!circle) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">Laddar…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto pt-safe pb-safe">
        <header className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => navigate("/")} aria-label="Tillbaka" className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl">{circle.name}</h1>
        </header>

        <div className="px-5 space-y-4">
          <div className="bg-card rounded-lg p-6">
            <p className="text-sm text-muted-foreground">{memberCount} {memberCount === 1 ? "medlem" : "medlemmar"}</p>
          </div>

          <Button onClick={() => navigate(`/chat/${circle.id}`)} className="w-full rounded-lg justify-center gap-2" style={{ backgroundColor: "#561828", color: "#fff" }}>
            <MessageCircle className="w-4 h-4" /> Öppna chatten
          </Button>

          <Button onClick={invite} variant="outline" className="w-full rounded-lg justify-center gap-2">
            <Share2 className="w-4 h-4" /> Bjud in
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CirclePage;
