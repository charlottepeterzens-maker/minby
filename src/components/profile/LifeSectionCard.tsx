import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Image,
  Link,
  Send,
  Check,
  X,
  RectangleHorizontal,
  LayoutList,
  MoreHorizontal,
  Trash2,
  Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PostReactions from "@/components/profile/PostReactions";
import PostComments from "@/components/profile/PostComments";
import ConfirmSheet from "@/components/ConfirmSheet";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";

interface LifePost {
  id: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  link_title: string | null;
  created_at: string;
  photo_layout: string;
}

interface Props {
  section: { id: string; name: string; emoji: string; min_tier: string };
  isOwner: boolean;
  onUpdated?: () => void;
}

const LifeSectionCard = ({ section, isOwner, onUpdated }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<LifePost[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [photoLayout, setPhotoLayout] = useState<"large" | "small">("large");
  const [posting, setPosting] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [editTier, setEditTier] = useState(section.min_tier);
  const [saving, setSaving] = useState(false);
  const [editingPost, setEditingPost] = useState<LifePost | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [savingPost, setSavingPost] = useState(false);

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (days === 0) return "idag";
    if (days === 1) return "igår";
    if (days < 30) return `för ${days} dagar se