import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TextButton from "@/components/ui/text-button";
import { Plus, LogOut, Camera, Pencil } from "lucide-react";
import CircleCard from "@/components/cards/CircleCard";
import { CircleCardSkeleton } from "@/components/cards/CardSkeletons";
import { toast } from "sonner";

interface Circle {
  id: string;
  name: string;
  hero_image_url: string | null;
}

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const HomePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [profile, setProfile] = useState<Profile>({ display_name: null, avatar_url: null, bio: null });
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: circleData, error }, { data: p }] = await Promise.all([
        supabase.from("circles").select("id, name, hero_image_url").order("created_at", { ascending: false }),
        supabase.from("profiles").select("display_name, avatar_url, bio").eq("user_id", user.id).maybeSingle(),
      ]);
      if (error) toast.error(error.message);
      else setCircles(circleData ?? []);
      if (p) setProfile(p);
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

  const openEdit = () => {
    setNameDraft(profile.display_name ?? "");
    setBioDraft(profile.bio ?? "");
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    if (!user) return;
    const payload = { user_id: user.id, display_name: nameDraft.trim() || null, bio: bioDraft.trim() || null };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    setProfile((p) => ({ ...p, display_name: payload.display_name, bio: payload.bio }));
    setEditingProfile(false);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error } = await supabase.from("profiles").upsert(
      { user_id: user.id, avatar_url: url },
      { onConflict: "user_id" },
    );
    if (error) { toast.error(error.message); return; }
    setProfile((p) => ({ ...p, avatar_url: url }));
  };

  const initials = (profile.display_name ?? user?.email ?? "?")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 pt-safe pb-safe">
        <header className="flex items-center justify-between py-6">
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, letterSpacing: "0.2em", color: "#C85A2E", textTransform: "lowercase" }}>minby</span>
          <button onClick={signOut} className="text-muted-foreground p-2" aria-label="Logga ut">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Profile header */}
        <section className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-[32%] overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: profile.avatar_url ? "transparent" : "#F9F3E1",
              border: profile.avatar_url ? "none" : "1px dashed #C85A2E",
              color: "#561828",
            }}
            aria-label={profile.avatar_url ? "Byt profilbild" : "Lägg till profilbild"}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : initials ? (
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20 }}>{initials}</span>
            ) : (
              <Camera className="w-5 h-5" />
            )}
            <span
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#C85A2E", color: "#fff" }}
            >
              <Camera className="w-3 h-3" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
          />
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={openEdit}
              className="flex items-center gap-2 text-left"
            >
              {profile.display_name ? (
                <span className="font-display text-xl text-foreground truncate">{profile.display_name}</span>
              ) : (
                  <span
                    className="text-[15px] font-medium underline underline-offset-2 decoration-2"
                    style={{ color: "#2B2B2B", textDecorationColor: "#C85A2E" }}
                  >
                    Lägg till ditt namn
                  </span>
              )}
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {profile.bio ? (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
            ) : (
              <button
                type="button"
                onClick={openEdit}
                className="text-sm mt-1"
                style={{ color: "#561828" }}
              >
                Skriv en kort presentation
              </button>
            )}
          </div>
        </section>

        {editingProfile && (
          <div className="mb-6 rounded-[28px] p-4 space-y-3" style={{ backgroundColor: "#F9F3E1" }}>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Ditt namn"
              className="w-full bg-transparent border-0 outline-none text-foreground"
            />
            <textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              placeholder="Kort om dig"
              rows={2}
              className="w-full bg-transparent border-0 outline-none text-foreground resize-none"
            />
            <div className="flex gap-6">
              <TextButton onClick={saveProfile}>Spara</TextButton>
              <TextButton variant="secondary" onClick={() => setEditingProfile(false)}>Avbryt</TextButton>
            </div>
          </div>
        )}

        <h1 className="font-display text-2xl text-foreground mb-4">Dina kretsar</h1>

        {loading ? (
          <div className="space-y-3">
            <CircleCardSkeleton />
            <CircleCardSkeleton />
          </div>
        ) : circles.length === 0 && !creating ? (
          <div className="space-y-3">
            <PlaceholderCircleCard
              name="Din första krets"
              summary="Så här kommer det se ut. Bjud in dina närmaste vänner så börjar det hända grejer här."
            />
            <PlaceholderCircleCard
              name="Familjen"
              summary="En krets för dem du delar vardag med — tips, träffar och bilder samlade på ett ställe."
            />
            <div className="pt-4 flex justify-center">
              <TextButton onClick={() => setCreating(true)}>
                + Skapa din första krets
              </TextButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {circles.map((c) => (
              <CircleCard
                key={c.id}
                circleId={c.id}
                name={c.name}
                onOpen={() => navigate(`/circle/${c.id}`)}
              />
            ))}

            {creating ? (
              <div className="rounded-[28px] p-4 space-y-3" style={{ backgroundColor: "#F9F3E1" }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Namn på kretsen"
                  className="w-full bg-transparent border-0 outline-none text-foreground"
                />
                <div className="flex gap-6">
                  <TextButton onClick={createCircle}>Skapa</TextButton>
                  <TextButton variant="secondary" onClick={() => { setCreating(false); setNewName(""); }}>Avbryt</TextButton>
                </div>
              </div>
            ) : (
              <div className="pt-4 flex justify-center">
                <TextButton onClick={() => setCreating(true)}>
                  + Ny krets
                </TextButton>
              </div>
            )}
          </div>
        )}

        <ProfilePlaceholders />
      </div>
    </div>
  );
};

const PlaceholderTag = () => (
  <span
    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
    style={{ backgroundColor: "#C85A2E", color: "#fff", letterSpacing: "0.12em" }}
  >
    Exempel
  </span>
);

const SectionHeader = ({ title, cta, onCta }: { title: string; cta: string; onCta?: () => void }) => (
  <div className="flex items-baseline justify-between mb-3 mt-10">
    <h2 className="font-display text-xl text-foreground">{title}</h2>
    <TextButton onClick={onCta}>{cta}</TextButton>
  </div>
);

const HorizontalStrip = ({
  items,
  gradient,
  size = "lg",
}: {
  items: { title: string; sub: string; bg: string; showTag?: boolean }[];
  gradient: "tips" | "photos";
  size?: "sm" | "lg";
}) => (
  <div className="flex overflow-x-auto -mx-5 px-5 pb-2 scrollbar-hide">
    {items.map((t, i) => (
      <PhotoTile
        key={i}
        imageUrl={null}
        title={t.title}
        ownerName={t.sub}
        size={size}
        gradient={gradient}
        tag={t.showTag ? "Exempel" : undefined}
        roundedLeft={i === 0}
        roundedRight={i === items.length - 1}
      />
    ))}
  </div>
);

const ProfilePlaceholders = () => (
  <>
    {/* Kommande träffar */}
    <SectionHeader title="Mina träffar" cta="+ Föreslå träff" />
    <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2">
      {[
        { host: "Sara", date: "Fre 21 nov", title: "Fika på Café Pascal", count: 2 },
        { host: "Mia", date: "Lör 29 nov", title: "Promenad i Hagaparken", count: 0 },
      ].map((m, i) => (
        <div
          key={i}
          className="w-[176px] flex-shrink-0 h-[184px] rounded-[28px] p-4 flex flex-col justify-between relative"
          style={{ backgroundColor: "#F2ECE3" }}
        >
          <div className="absolute top-3 right-3"><PlaceholderTag /></div>
          <div>
            <div className="text-[13px] mb-2" style={{ color: "#675332" }}>{m.host}</div>
            <div className="text-[16px] leading-tight font-medium" style={{ color: "#2B2B2B" }}>
              {m.date}<br />{m.title}
            </div>
          </div>
          <div>
            <div className="text-[12px] mb-1" style={{ color: "#561828" }}>
              {m.count === 0 ? "Ingen har svarat" : `${m.count} har svarat`}
            </div>
            <span
              className="text-[15px] font-medium underline underline-offset-2 decoration-2"
              style={{ color: "#2B2B2B", textDecorationColor: "#C85A2E" }}
            >
              Häng med!
            </span>
          </div>
        </div>
      ))}
    </div>
    <p className="text-sm mt-2" style={{ color: "#561828" }}>
      Föreslå en träff i någon av dina kretsar så syns den här.
    </p>

    {/* Mina tips */}
    <SectionHeader title="Mina tips" cta="+ Dela ett tips" />
    <HorizontalStrip
      gradient={TIPS_GRADIENT}
      items={[
        { title: "Bagarstugan", sub: "Du", bg: "#E8DDC6", showTag: true },
        { title: "Podd: Filosofiska rummet", sub: "Du", bg: "#DCEAF8" },
        { title: "Bok: Klara och solen", sub: "Du", bg: "#F5EFD9" },
      ]}
    />
    <p className="text-sm mt-2" style={{ color: "#561828" }}>
      Dela en plats, bok, podd eller länk du gillar med en krets.
    </p>

    {/* Foton */}
    <SectionHeader title="Mina foton" cta="+ Ladda upp foto" />
    <HorizontalStrip
      gradient={PHOTOS_GRADIENT}
      items={[
        { title: "Barnen", sub: "Du", bg: "#E8DDC6", showTag: true },
        { title: "Huset", sub: "Du", bg: "#DCEAF8" },
        { title: "Sommar", sub: "Du", bg: "#F5EFD9" },
        { title: "Resan", sub: "Du", bg: "#F2ECE3" },
      ]}
    />
    <p className="text-sm mt-2" style={{ color: "#561828" }}>
      Bilder du delar i dina kretsar samlas här som ett gemensamt minne.
    </p>

    {/* Om mig */}
    <SectionHeader title="Om mig" cta="+ Lägg till" />
    <div
      className="rounded-[28px] p-5 space-y-3 relative"
      style={{ backgroundColor: "#F9F3E1" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px]" style={{ color: "#675332" }}>Bor i</span>
        <span className="text-[15px]" style={{ color: "#2B2B2B" }}>Stockholm</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px]" style={{ color: "#675332" }}>Jobbar med</span>
        <span className="text-[15px]" style={{ color: "#2B2B2B" }}>Illustration</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px]" style={{ color: "#675332" }}>Gillar</span>
        <span className="text-[15px]" style={{ color: "#2B2B2B" }}>Långa promenader, keramik</span>
      </div>
      <div className="pt-1"><PlaceholderTag /></div>
    </div>
    <p className="text-sm mt-2 mb-8" style={{ color: "#561828" }}>
      Lägg till några små saker om dig så dina vänner lär känna dig bättre.
    </p>
  </>
);

const PlaceholderCircleCard = ({ name, summary }: { name: string; summary: string }) => (
  <div
    className="w-full rounded-[28px] p-5 flex gap-4 relative"
    style={{ backgroundColor: "#F9F3E1" }}
  >
    <span
      className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
      style={{ backgroundColor: "#C85A2E", color: "#fff", letterSpacing: "0.12em" }}
    >
      Exempel
    </span>
    <div className="flex-1 min-w-0">
      <div className="text-[13px] mb-2" style={{ fontFamily: "'Outfit', sans-serif", color: "#561828" }}>
        {name}
      </div>
      <p className="text-[15px] leading-snug mb-3" style={{ color: "#2B2B2B" }}>
        {summary}
      </p>
        <span
          className="text-[15px] font-medium underline underline-offset-2 decoration-2"
          style={{ color: "#2B2B2B", textDecorationColor: "#C85A2E" }}
        >
          Skapa din egen
        </span>
    </div>
    <div className="flex-shrink-0 w-[92px] h-[92px] relative">
      <div className="absolute top-0 right-0 w-12 h-12 rounded-full" style={{ backgroundColor: "#DCEAF8" }} />
      <div className="absolute top-8 left-0 w-11 h-11 rounded-full" style={{ backgroundColor: "#E8DDC6" }} />
      <div className="absolute bottom-0 right-2 w-10 h-10 rounded-full" style={{ backgroundColor: "#F5EFD9" }} />
    </div>
  </div>
);

export default HomePage;
