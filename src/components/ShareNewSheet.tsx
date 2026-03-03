import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Sparkles, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShareNewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ShareType = "life_update" | "meeting";

interface Group { id: string; name: string; emoji: string; }
interface Section { id: string; name: string; emoji: string; section_type: string; }

const vibes = [
  { value: "chill", label: "Chill" },
  { value: "adventure", label: "Adventure" },
  { value: "creative", label: "Creative" },
  { value: "selfcare", label: "Self-care" },
];

const emojiSuggestions = ["🎬", "🎨", "🧘", "🍷", "☕", "🌿", "🏖️", "💅", "📚", "🎵", "🍕", "🌸"];

const ShareNewSheet = ({ open, onOpenChange }: ShareNewSheetProps) => {
  const { user } = useAuth();
  const [shareType, setShareType] = useState<ShareType | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  // Life update fields
  const [selectedSection, setSelectedSection] = useState("");
  const [content, setContent] = useState("");

  // Meeting fields
  const [selectedGroup, setSelectedGroup] = useState("");
  const [title, setTitle] = useState("");
  const [dateText, setDateText] = useState("");
  const [location, setLocation] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("chill");
  const [selectedEmoji, setSelectedEmoji] = useState("🎬");

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [{ data: memberships }, { data: sectionsData }] = await Promise.all([
      supabase.from("group_memberships").select("group_id").eq("user_id", user.id),
      supabase.from("life_sections").select("id, name, emoji, section_type").eq("user_id", user.id).order("sort_order"),
    ]);

    if (sectionsData) setSections(sectionsData);

    if (memberships?.length) {
      const { data: groupsData } = await supabase
        .from("friend_groups")
        .select("id, name, emoji")
        .in("id", memberships.map((m) => m.group_id));
      if (groupsData) setGroups(groupsData);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      fetchData();
      setShareType(null);
    }
  }, [open, fetchData]);

  const resetForm = () => {
    setShareType(null);
    setSelectedSection("");
    setContent("");
    setSelectedGroup("");
    setTitle("");
    setDateText("");
    setLocation("");
    setSelectedVibe("chill");
    setSelectedEmoji("🎬");
  };

  const handlePostLifeUpdate = async () => {
    if (!user || !selectedSection || !content) return;
    setLoading(true);
    const { error } = await supabase.from("life_posts").insert({
      user_id: user.id,
      section_id: selectedSection,
      content,
    });
    if (error) {
      toast.error("Couldn't post update");
    } else {
      toast.success("Update shared!");
      resetForm();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleCreateMeeting = async () => {
    if (!user || !selectedGroup || !title || !dateText) return;
    setLoading(true);
    const { error } = await supabase.from("plans").insert({
      group_id: selectedGroup,
      created_by: user.id,
      title,
      emoji: selectedEmoji,
      date_text: dateText,
      location: location || null,
      vibe: selectedVibe,
    });
    if (error) {
      toast.error("Couldn't create suggestion");
    } else {
      toast.success("Meeting suggested!");
      resetForm();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Share something new</SheetTitle>
        </SheetHeader>

        {!shareType ? (
          <div className="grid grid-cols-2 gap-3 py-6">
            <button
              onClick={() => setShareType("life_update")}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-muted/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <Sparkles className="w-8 h-8 text-primary" />
              <div className="text-center">
                <p className="font-display font-semibold text-foreground">Life update</p>
                <p className="text-xs text-muted-foreground mt-0.5">Share with your circles</p>
              </div>
            </button>
            <button
              onClick={() => setShareType("meeting")}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-muted/50 border border-border/50 hover:border-secondary/30 hover:bg-secondary/5 transition-all"
            >
              <CalendarDays className="w-8 h-8 text-secondary-foreground" />
              <div className="text-center">
                <p className="font-display font-semibold text-foreground">Suggest meeting</p>
                <p className="text-xs text-muted-foreground mt-0.5">Gather your friends</p>
              </div>
            </button>
          </div>
        ) : shareType === "life_update" ? (
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Choose a life section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.filter(s => s.section_type === "posts").map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">What's new?</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share an update with your circles..."
                className="mt-1.5 rounded-xl bg-muted/50 border-border/50 min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShareType(null)} className="rounded-xl flex-1">Back</Button>
              <Button onClick={handlePostLifeUpdate} disabled={!selectedSection || !content || loading} className="rounded-xl flex-1">
                Share
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Group</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.emoji} {g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Emoji</Label>
              <div className="flex flex-wrap gap-2">
                {emojiSuggestions.map((e) => (
                  <button
                    key={e}
                    onClick={() => setSelectedEmoji(e)}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      selectedEmoji === e ? "bg-primary/15 ring-2 ring-primary/30 scale-110" : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">What's the plan?</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cinema night, brunch..." className="mt-1.5 rounded-xl bg-muted/50 border-border/50" />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">When?</Label>
              <Input value={dateText} onChange={(e) => setDateText(e.target.value)} placeholder="Saturday, next week..." className="mt-1.5 rounded-xl bg-muted/50 border-border/50" />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Where? (optional)</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="My place, the park..." className="mt-1.5 rounded-xl bg-muted/50 border-border/50" />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Vibe</Label>
              <div className="flex gap-2 flex-wrap">
                {vibes.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setSelectedVibe(v.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedVibe === v.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShareType(null)} className="rounded-xl flex-1">Back</Button>
              <Button onClick={handleCreateMeeting} disabled={!selectedGroup || !title || !dateText || loading} className="rounded-xl flex-1">
                Suggest
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ShareNewSheet;
