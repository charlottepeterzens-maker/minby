import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TextButton from "@/components/ui/text-button";
import { Camera, Menu } from "lucide-react";
import CircleCard from "@/components/cards/CircleCard";
import PhotoTile from "@/components/cards/PhotoTile";
import { CircleCardSkeleton } from "@/components/cards/CardSkeletons";
import { ExampleTag } from "@/components/ui/example-tag";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const { user } = useAuth();
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
          <button
            onClick={() => navigate("/settings")}
            className="text-foreground p-2"
            aria-label="Inställningar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Profile header */}
        <section className="flex items-center gap-4 mb-8">
          <div
            className="relative w-20 h-20 rounded-[32%] overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: profile.avatar_url ? "transparent" : "#F9F3E1",
              border: profile.avatar_url ? "none" : "1px dashed #C85A2E",
              color: "#561828",
            }}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : initials ? (
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20 }}>{initials}</span>
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
          />
          <div className="flex-1 min-w-0">
            {profile.display_name ? (
              <span className="font-display text-xl text-foreground truncate block">{profile.display_name}</span>
            ) : (
              <button type="button" onClick={openEdit} className="text-left">
                <span
                  className="text-button underline underline-offset-2 decoration-1"
                  style={{ color: "#2B2B2B", textDecorationColor: "#C85A2E" }}
                >
                  Lägg till ditt namn
                </span>
              </button>
            )}
            {profile.bio ? (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
            ) : (
              <div className="mt-1">
                <TextButton type="button" onClick={openEdit}>
                  Skriv en kort presentation
                </TextButton>
              </div>
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

        <h2 className="font-display text-xl text-foreground mb-4">Mina kretsar</h2>

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
                  + Skapa och bjud in till en krets
                </TextButton>
              </div>
            )}
          </div>
        )}

        <ProfilePlaceholders
          userId={user?.id ?? null}
          circles={circles}
          displayName={profile.display_name ?? ""}
        />
      </div>
    </div>
  );
};

const PlaceholderTag = () => <ExampleTag />;


const SectionHeader = ({ title, cta, onCta, disabled }: { title: string; cta: string; onCta?: () => void; disabled?: boolean }) => (
  <div className="flex items-baseline justify-between mb-3 mt-10">
    <h2 className="font-display text-xl text-foreground">{title}</h2>
    <TextButton onClick={onCta} disabled={disabled}>{cta}</TextButton>
  </div>
);

const HorizontalStrip = ({
  items,
  gradient,
  size = "lg",
}: {
  items: { title: string; sub: string; bg: string; showTag?: boolean; imageUrl?: string | null }[];
  gradient: "tips" | "photos";
  size?: "sm" | "lg";
}) => (
  <div className="flex overflow-x-auto -mx-5 px-5 pb-2 scrollbar-hide">
    {items.map((t, i) => (
      <PhotoTile
        key={i}
        imageUrl={t.imageUrl ?? null}
        title={t.title}
        ownerName={t.sub}
        size={size}
        gradient={gradient}
        tag={t.showTag ? "exempel" : undefined}
        roundedLeft={i === 0}
        roundedRight={i === items.length - 1}
      />
    ))}
  </div>
);

interface MeetingItem {
  id: string;
  title: string;
  meeting_date: string | null;
  created_by: string;
  circle_id: string;

  host_name: string;
  response_count: number;
  isMine: boolean;
}

interface MyTip {
  id: string;
  title: string;
  image_url: string | null;
}
interface MyPhoto {
  id: string;
  image_url: string | null;
  created_at: string;
}

const formatMeetingDate = (iso: string | null) => {
  if (!iso) return "Datum ej satt";
  const d = new Date(iso);
  const weekdays = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
};

const ProfilePlaceholders = ({ userId, circles, displayName }: { userId: string | null; circles: Circle[]; displayName: string }) => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingItem[] | null>(null);
  const [myTips, setMyTips] = useState<MyTip[] | null>(null);
  const [myPhotos, setMyPhotos] = useState<MyPhoto[] | null>(null);

  // Creation sheet state
  const [showTipForm, setShowTipForm] = useState(false);
  const [tipTitle, setTipTitle] = useState("");
  const [tipUrl, setTipUrl] = useState("");
  const [tipComment, setTipComment] = useState("");
  const [tipImageFile, setTipImageFile] = useState<File | null>(null);
  const [tipImagePreview, setTipImagePreview] = useState<string | null>(null);
  const tipImageInputRef = useRef<HTMLInputElement>(null);
  const [savingTip, setSavingTip] = useState(false);
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);

  const [showPhotoForm, setShowPhotoForm] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: mtgs, error }, { data: tipRows }, { data: photoRows }] = await Promise.all([
        supabase
          .from("meetings")
          .select("id, title, meeting_date, created_by, circle_id")
          .order("meeting_date", { ascending: true, nullsFirst: false }),
        supabase
          .from("tips")
          .select("id, title, image_path")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("photos")
          .select("id, storage_path, created_at")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (error || !mtgs) setMeetings([]);
      else {
        const creatorIds = Array.from(new Set(mtgs.map((m) => m.created_by)));
        const ids = mtgs.map((m) => m.id);
        const [{ data: profs }, { data: resps }] = await Promise.all([
          creatorIds.length
            ? supabase.from("profiles").select("user_id, display_name").in("user_id", creatorIds)
            : Promise.resolve({ data: [] as { user_id: string; display_name: string | null }[] }),
          ids.length
            ? supabase.from("meeting_responses").select("meeting_id").in("meeting_id", ids)
            : Promise.resolve({ data: [] as { meeting_id: string }[] }),
        ]);
        const nameById = new Map((profs ?? []).map((p) => [p.user_id, p.display_name ?? "Någon"]));
        const counts = new Map<string, number>();
        (resps ?? []).forEach((r) => counts.set(r.meeting_id, (counts.get(r.meeting_id) ?? 0) + 1));

        setMeetings(
          mtgs.map((m) => ({
            id: m.id,
            title: m.title,
            meeting_date: m.meeting_date,
            created_by: m.created_by,
            circle_id: m.circle_id,
            host_name: nameById.get(m.created_by) ?? "Någon",
            response_count: counts.get(m.id) ?? 0,
            isMine: m.created_by === userId,
          })),
        );
      }

      // Sign tip + photo images
      const tipPaths = (tipRows ?? []).map((t) => t.image_path).filter(Boolean) as string[];
      const photoPaths = (photoRows ?? []).map((p) => p.storage_path).filter(Boolean) as string[];
      const [tipSigned, photoSigned] = await Promise.all([
        tipPaths.length
          ? supabase.storage.from("circle-photos").createSignedUrls(tipPaths, 60 * 60)
          : Promise.resolve({ data: [] as { path: string; signedUrl: string }[] }),
        photoPaths.length
          ? supabase.storage.from("circle-photos").createSignedUrls(photoPaths, 60 * 60)
          : Promise.resolve({ data: [] as { path: string; signedUrl: string }[] }),
      ]);
      const tipMap = new Map((tipSigned.data ?? []).map((d) => [d.path, d.signedUrl]));
      const photoMap = new Map((photoSigned.data ?? []).map((d) => [d.path, d.signedUrl]));
      setMyTips((tipRows ?? []).map((t) => ({ id: t.id, title: t.title, image_url: t.image_path ? tipMap.get(t.image_path) ?? null : null })));
      setMyPhotos((photoRows ?? []).map((p) => ({ id: p.id, created_at: p.created_at, image_url: p.storage_path ? photoMap.get(p.storage_path) ?? null : null })));
    })();
  }, [userId]);

  const hasMeetings = meetings && meetings.length > 0;
  const hasTips = myTips && myTips.length > 0;
  const hasPhotos = myPhotos && myPhotos.length > 0;

  const openTipForm = () => {
    if (!circles.length) { toast.error("Skapa en krets först"); return; }
    setSelectedCircles(circles.length === 1 ? [circles[0].id] : []);
    setShowTipForm(true);
  };

  const openPhotoForm = () => {
    if (!circles.length) { toast.error("Skapa en krets först"); return; }
    setSelectedCircles(circles.length === 1 ? [circles[0].id] : []);
    photoInputRef.current?.click();
  };

  const toggleCircle = (id: string) => {
    setSelectedCircles((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const createTip = async () => {
    if (!userId || !tipTitle.trim() || !selectedCircles.length) return;
    setSavingTip(true);
    let imagePath: string | null = null;
    const trimmedUrl = tipUrl.trim();
    const bucketPrefix = selectedCircles[0];

    if (tipImageFile) {
      try {
        const ext = tipImageFile.name.split(".").pop() || "jpg";
        const path = `${bucketPrefix}/tips/${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("circle-photos").upload(path, tipImageFile, { contentType: tipImageFile.type });
        if (upErr) throw upErr;
        imagePath = path;
      } catch (e: any) {
        setSavingTip(false); toast.error(e?.message ?? "Kunde inte ladda upp"); return;
      }
    } else if (trimmedUrl) {
      try {
        const { data: preview } = await supabase.functions.invoke("fetch-link-preview", {
          body: { url: trimmedUrl, uploadBucket: "circle-photos", uploadPrefix: `${bucketPrefix}/tips` },
        });
        if (preview?.storagePath) imagePath = preview.storagePath as string;
      } catch (e) { console.error(e); }
    }

    const { data, error } = await supabase.from("tips").insert({
      owner_id: userId,
      title: tipTitle.trim(),
      url: trimmedUrl || null,
      comment: tipComment.trim() || null,
      image_path: imagePath,
    }).select("id, title, image_path").single();
    if (error || !data) { setSavingTip(false); toast.error(error?.message ?? "Kunde inte spara"); return; }

    const { error: visErr } = await supabase.from("tip_visibility")
      .insert(selectedCircles.map((c) => ({ tip_id: data.id, circle_id: c })));
    setSavingTip(false);
    if (visErr) { toast.error(visErr.message); return; }

    let signedUrl: string | null = null;
    if (data.image_path) {
      const { data: s } = await supabase.storage.from("circle-photos").createSignedUrl(data.image_path, 60 * 60);
      signedUrl = s?.signedUrl ?? null;
    }
    setMyTips((prev) => [{ id: data.id, title: data.title, image_url: signedUrl }, ...(prev ?? [])]);
    setTipTitle(""); setTipUrl(""); setTipComment("");
    setTipImageFile(null);
    if (tipImagePreview) { URL.revokeObjectURL(tipImagePreview); setTipImagePreview(null); }
    setShowTipForm(false);
    toast.success("Tipset är delat");
  };

  const uploadPhoto = async () => {
    if (!userId || !photoFile || !selectedCircles.length) return;
    setUploadingPhoto(true);
    try {
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("circle-photos").upload(path, photoFile, { contentType: photoFile.type });
      if (upErr) throw upErr;
      const { data: photoRow, error: insErr } = await supabase.from("photos")
        .insert({ owner_id: userId, storage_path: path })
        .select("id, storage_path, created_at").single();
      if (insErr || !photoRow) throw insErr ?? new Error("Kunde inte spara foto");
      const { error: visErr } = await supabase.from("photo_visibility")
        .insert(selectedCircles.map((c) => ({ photo_id: photoRow.id, circle_id: c })));
      if (visErr) throw visErr;
      const { data: signed } = await supabase.storage.from("circle-photos").createSignedUrl(path, 60 * 60);
      setMyPhotos((prev) => [{ id: photoRow.id, created_at: photoRow.created_at, image_url: signed?.signedUrl ?? null }, ...(prev ?? [])]);
      toast.success("Fotot är delat");
      setPhotoFile(null);
      if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }
      setShowPhotoForm(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte ladda upp");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const CirclePicker = () => (
    <div className="space-y-2">
      <div className="text-[12px]" style={{ color: "#561828" }}>Dela med</div>
      <div className="flex flex-wrap gap-2">
        {circles.map((c) => {
          const active = selectedCircles.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCircle(c.id)}
              className="px-3 py-1.5 rounded-full text-[13px]"
              style={{
                backgroundColor: active ? "#C85A2E" : "#F9F3E1",
                color: active ? "white" : "#2B2B2B",
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
  <>
    {/* Kommande träffar */}
    <SectionHeader title="Mina träffar" cta="+ Föreslå träff" onCta={() => circles[0] && navigate(`/circle/${circles[0].id}`)} disabled={!circles.length} />
    {hasMeetings ? (
      <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2">
        {meetings!.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/circle/${m.circle_id}`)}
            className="w-[176px] flex-shrink-0 h-[184px] rounded-[28px] p-4 flex flex-col justify-between relative text-left"
            style={{ backgroundColor: "#F2ECE3" }}
          >
            <div>
              <div className="text-[13px] mb-2" style={{ color: "#675332" }}>
                {m.isMine ? "Du" : m.host_name}
              </div>
              <div className="text-[16px] leading-tight font-medium" style={{ color: "#2B2B2B" }}>
                {formatMeetingDate(m.meeting_date)}<br />{m.title}
              </div>
            </div>
            <div>
              <div className="text-[12px] mb-1" style={{ color: "#561828" }}>
                {m.response_count === 0 ? "Ingen har svarat" : `${m.response_count} har svarat`}
              </div>
              <span
                className="text-[15px] font-medium underline underline-offset-2 decoration-2"
                style={{ color: "#2B2B2B", textDecorationColor: "#C85A2E" }}
              >
                {m.isMine ? "Öppna" : "Häng med!"}
              </span>
            </div>
          </button>
        ))}
      </div>
    ) : (
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
    )}
    <p className="text-sm mt-2" style={{ color: "#561828" }}>
      Föreslå en träff i någon av dina kretsar så syns den här.
    </p>


    {/* Mina tips */}
    <SectionHeader title="Mina tips" cta="+ Dela ett tips" onCta={openTipForm} disabled={!circles.length} />
    {hasTips ? (
      <HorizontalStrip
        gradient="tips"
        items={myTips!.map((t) => ({ title: t.title, sub: displayName || "Du", bg: "#E8DDC6", imageUrl: t.image_url }))}
      />
    ) : (
      <HorizontalStrip
        gradient="tips"
        items={[
          { title: "Bagarstugan", sub: "Du", bg: "#E8DDC6", showTag: true },
          { title: "podd: Filosofiska rummet", sub: "Du", bg: "#DCEAF8" },
          { title: "bok: Klara och solen", sub: "Du", bg: "#F5EFD9" },
        ]}
      />
    )}
    <p className="text-sm mt-2" style={{ color: "#561828" }}>
      {circles.length ? "Dela en plats, bok, podd eller länk du gillar med en krets." : "Skapa en krets så kan du dela tips."}
    </p>

    {/* Foton */}
    <SectionHeader title="Mina foton" cta="+ Ladda upp foto" onCta={openPhotoForm} disabled={!circles.length} />
    <input
      ref={photoInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          setPhotoFile(f);
          if (photoPreview) URL.revokeObjectURL(photoPreview);
          setPhotoPreview(URL.createObjectURL(f));
          setShowPhotoForm(true);
        }
        e.target.value = "";
      }}
    />
    {hasPhotos ? (
      <HorizontalStrip
        gradient="photos"
        items={myPhotos!.map((p) => ({ title: displayName || "Du", sub: new Date(p.created_at).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }), bg: "#E8DDC6", imageUrl: p.image_url }))}
      />
    ) : (
      <HorizontalStrip
        gradient="photos"
        items={[
          { title: "Barnen", sub: "Du", bg: "#E8DDC6", showTag: true },
          { title: "Huset", sub: "Du", bg: "#DCEAF8" },
          { title: "Sommar", sub: "Du", bg: "#F5EFD9" },
          { title: "Resan", sub: "Du", bg: "#F2ECE3" },
        ]}
      />
    )}
    <p className="text-sm mt-2" style={{ color: "#561828" }}>
      {circles.length ? "Bilder du delar i dina kretsar samlas här som ett gemensamt minne." : "Skapa en krets så kan du dela foton."}
    </p>

    {/* Tip create sheet */}
    <Sheet open={showTipForm} onOpenChange={setShowTipForm}>
      <SheetContent side="bottom" className="rounded-t-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="text-left">
          <SheetTitle style={{ fontFamily: "'Outfit', sans-serif", color: "#2B2B2B" }}>Dela ett tips</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <Input placeholder="Titel" value={tipTitle} onChange={(e) => setTipTitle(e.target.value)} className="rounded-lg" />
          <Input placeholder="Länk (valfritt)" value={tipUrl} onChange={(e) => setTipUrl(e.target.value)} className="rounded-lg" />
          <Textarea placeholder="Kommentar (valfritt)" value={tipComment} onChange={(e) => setTipComment(e.target.value)} rows={3} className="rounded-lg resize-none" />
          <input
            ref={tipImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setTipImageFile(f);
                if (tipImagePreview) URL.revokeObjectURL(tipImagePreview);
                setTipImagePreview(URL.createObjectURL(f));
              }
              e.target.value = "";
            }}
          />
          {tipImagePreview ? (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-[16px] bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${tipImagePreview})` }} />
              <div className="flex flex-col items-start gap-1">
                <TextButton onClick={() => tipImageInputRef.current?.click()}>Byt bild</TextButton>
                <TextButton variant="secondary" onClick={() => { setTipImageFile(null); if (tipImagePreview) URL.revokeObjectURL(tipImagePreview); setTipImagePreview(null); }}>Ta bort bild</TextButton>
              </div>
            </div>
          ) : (
            <TextButton onClick={() => tipImageInputRef.current?.click()}>+ Lägg till eget foto</TextButton>
          )}
          <CirclePicker />
          <div className="flex justify-end pt-2">
            <TextButton onClick={createTip} disabled={!tipTitle.trim() || !selectedCircles.length || savingTip}>
              {savingTip ? "Sparar…" : "Dela tips"}
            </TextButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {/* Photo upload sheet */}
    <Sheet open={showPhotoForm} onOpenChange={(o) => { setShowPhotoForm(o); if (!o) { setPhotoFile(null); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null); } }}>
      <SheetContent side="bottom" className="rounded-t-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="text-left">
          <SheetTitle style={{ fontFamily: "'Outfit', sans-serif", color: "#2B2B2B" }}>Ladda upp foto</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {photoPreview && (
            <img src={photoPreview} alt="" className="w-full max-h-[240px] object-cover rounded-2xl" />
          )}
          <CirclePicker />
          <div className="flex justify-end pt-2">
            <TextButton onClick={uploadPhoto} disabled={!photoFile || !selectedCircles.length || uploadingPhoto}>
              {uploadingPhoto ? "Laddar upp…" : "Dela foto"}
            </TextButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>

  </>
  );
};


const PlaceholderCircleCard = ({ name, summary }: { name: string; summary: string }) => (
  <div
    className="w-full rounded-[28px] p-5 flex gap-4 relative"
    style={{ backgroundColor: "#F9F3E1" }}
  >
    <ExampleTag className="absolute top-3 right-3" />
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
