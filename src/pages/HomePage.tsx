import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, LogOut } from "lucide-react";
import CircleCard from "@/components/cards/CircleCard";
import { toast } from "sonner";

interface Circle {
  id: string;
  name: string;
  hero_image_url: string | null;
}

const HomePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("circles")
        .select("id, name, hero_image_url")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      else setCircles(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const createCircle = async () => {
    if (!user || !newName.trim()) return;
    const { data, error } = await supabase
      .from("circles")
      .insert({ name: newName.trim(), created_by: user.id })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setNewName("");
    setCreating(false);
    navigate(`/circle/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 pt-safe pb-safe">
        <header className="flex items-center justify-between py-6">
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, letterSpacing: "0.2em", color: "#C4522A", textTransform: "lowercase" }}>minby</span>
          <button onClick={signOut} className="text-muted-foreground p-2" aria-label="Logga ut">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <h1 className="font-display text-2xl text-foreground mb-6">Dina kretsar</h1>

        {loading ? (
          <p className="text-muted-foreground text-sm">Laddar…</p>
        ) : circles.length === 0 && !creating ? (
          <div className="py-12">
            <p className="text-muted-foreground text-sm mb-6">Du har inga kretsar än. Skapa din första för att komma igång.</p>
            <Button onClick={() => setCreating(true)} className="rounded-lg" style={{ backgroundColor: "#561828", color: "#fff" }}>
              <Plus className="w-4 h-4 mr-2" /> Skapa krets
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {circles.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/circle/${c.id}`)}
                className="w-full bg-card rounded-lg p-4 flex items-center gap-3 text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0" style={{
                  backgroundImage: c.hero_image_url ? `url(${c.hero_image_url})` : undefined,
                  backgroundSize: "cover", backgroundPosition: "center",
                }} />
                <span className="font-display text-lg text-foreground">{c.name}</span>
              </button>
            ))}

            {creating ? (
              <div className="bg-card rounded-lg p-4 space-y-3">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Namn på kretsen"
                  className="w-full bg-transparent border-0 outline-none text-foreground"
                />
                <div className="flex gap-2">
                  <Button onClick={createCircle} className="rounded-lg" style={{ backgroundColor: "#561828", color: "#fff" }}>Skapa</Button>
                  <Button variant="ghost" onClick={() => { setCreating(false); setNewName(""); }} className="rounded-lg">Avbryt</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full mt-4 rounded-lg py-4 text-sm text-muted-foreground border border-dashed border-border flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Ny krets
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
