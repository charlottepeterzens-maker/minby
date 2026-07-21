import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TextButton from "@/components/ui/text-button";
import { toast } from "sonner";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2
      className="text-[11px] mb-2 px-1"
      style={{ color: "#675332", letterSpacing: "0.08em", textTransform: "lowercase" }}
    >
      {title}
    </h2>
    <div className="rounded-[28px] overflow-hidden" style={{ backgroundColor: "#F9F3E1" }}>
      {children}
    </div>
  </section>
);

const Row = ({
  label,
  value,
  onClick,
  danger,
}: {
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-black/[0.03] transition-colors"
  >
    <span className="text-[15px]" style={{ color: danger ? "#561828" : "#2B2B2B" }}>{label}</span>
    {value !== undefined && (
      <span className="text-[14px] truncate ml-4" style={{ color: "#675332" }}>{value}</span>
    )}
  </button>
);

const Divider = () => <div className="h-px mx-5" style={{ backgroundColor: "#E8DDC6" }} />;

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({ display_name: null, avatar_url: null, bio: null });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<"name" | "bio" | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile(data);
      setLoading(false);
    })();
  }, [user]);

  const saveField = async (field: "display_name" | "bio", value: string) => {
    if (!user) return;
    const trimmed = value.trim() || null;
    const payload = field === "display_name"
      ? { user_id: user.id, display_name: trimmed }
      : { user_id: user.id, bio: trimmed };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    setProfile((p) => ({ ...p, [field]: trimmed }));
    setEditing(null);
    toast.success("Sparat");
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
    toast.success("Profilbild uppdaterad");
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
        <header className="flex items-center justify-between py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 p-2 -ml-2 text-foreground"
            aria-label="Tillbaka"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[14px]">Tillbaka</span>
          </button>
          <span className="text-[14px]" style={{ color: "#675332" }}>Inställningar</span>
          <div className="w-16" />
        </header>

        {loading ? (
          <div className="h-40 rounded-[28px] animate-pulse" style={{ backgroundColor: "#F2ECE3" }} />
        ) : (
          <>
            {/* Avatar */}
            <div className="flex flex-col items-center mb-8 mt-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-24 h-24 rounded-[32%] overflow-hidden flex items-center justify-center"
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
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24 }}>{initials}</span>
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 text-button underline underline-offset-2 decoration-1"
                style={{ color: "#2B2B2B", textDecorationColor: "#C85A2E" }}
              >
                {profile.avatar_url ? "Byt profilbild" : "Lägg till profilbild"}
              </button>
            </div>

            {/* Profil */}
            <Section title="profil">
              {editing === "name" ? (
                <div className="p-5 space-y-3">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Ditt namn"
                    className="w-full bg-transparent border-0 outline-none text-foreground text-[15px]"
                  />
                  <div className="flex gap-6">
                    <TextButton onClick={() => saveField("display_name", nameDraft)}>Spara</TextButton>
                    <TextButton variant="secondary" onClick={() => setEditing(null)}>Avbryt</TextButton>
                  </div>
                </div>
              ) : (
                <Row
                  label="Namn"
                  value={profile.display_name ?? "Lägg till"}
                  onClick={() => { setNameDraft(profile.display_name ?? ""); setEditing("name"); }}
                />
              )}
              <Divider />
              {editing === "bio" ? (
                <div className="p-5 space-y-3">
                  <textarea
                    autoFocus
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    placeholder="Kort om dig"
                    rows={3}
                    className="w-full bg-transparent border-0 outline-none text-foreground text-[15px] resize-none"
                  />
                  <div className="flex gap-6">
                    <TextButton onClick={() => saveField("bio", bioDraft)}>Spara</TextButton>
                    <TextButton variant="secondary" onClick={() => setEditing(null)}>Avbryt</TextButton>
                  </div>
                </div>
              ) : (
                <Row
                  label="Presentation"
                  value={profile.bio ? (profile.bio.length > 24 ? profile.bio.slice(0, 24) + "…" : profile.bio) : "Lägg till"}
                  onClick={() => { setBioDraft(profile.bio ?? ""); setEditing("bio"); }}
                />
              )}
            </Section>

            {/* Konto */}
            <Section title="konto">
              <Row label="E-post" value={user?.email ?? ""} />
            </Section>

            {/* Om */}
            <Section title="om minby">
              <Row label="Integritetspolicy" onClick={() => navigate("/privacy")} />
              <Divider />
              <Row label="Användarvillkor" onClick={() => navigate("/terms")} />
            </Section>

            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 py-4 mt-4 mb-8"
              style={{ color: "#561828" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[15px]">Logga ut</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
