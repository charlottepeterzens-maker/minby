
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Friend groups
CREATE TABLE public.friend_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '👯',
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;

-- Group memberships
CREATE TABLE public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.friend_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;

-- Plans
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.friend_groups(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎬',
  date_text TEXT NOT NULL,
  location TEXT,
  vibe TEXT NOT NULL DEFAULT 'chill' CHECK (vibe IN ('chill', 'adventure', 'creative', 'selfcare')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- RSVPs
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in' CHECK (status IN ('in', 'out', 'maybe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, user_id)
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Helper function: is user a member of a group?
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_id = _group_id AND user_id = auth.uid()
  )
$$;

-- Helper function: is user the owner of a group?
CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friend_groups
    WHERE id = _group_id AND owner_id = auth.uid()
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-add owner as member when group is created
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_memberships (group_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_created
  AFTER INSERT ON public.friend_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_group();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Friend groups: only members can see
CREATE POLICY "Members can view groups" ON public.friend_groups FOR SELECT TO authenticated USING (public.is_group_member(id));
CREATE POLICY "Authenticated can create groups" ON public.friend_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update group" ON public.friend_groups FOR UPDATE TO authenticated USING (public.is_group_owner(id));
CREATE POLICY "Owner can delete group" ON public.friend_groups FOR DELETE TO authenticated USING (public.is_group_owner(id));

-- Group memberships
CREATE POLICY "Members can view memberships" ON public.group_memberships FOR SELECT TO authenticated USING (public.is_group_member(group_id));
CREATE POLICY "Owner can add members" ON public.group_memberships FOR INSERT TO authenticated WITH CHECK (public.is_group_owner(group_id) AND user_id != auth.uid());
CREATE POLICY "Owner auto-added as member" ON public.group_memberships FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'owner');
CREATE POLICY "Owner can remove or user can leave" ON public.group_memberships FOR DELETE TO authenticated USING (public.is_group_owner(group_id) OR user_id = auth.uid());

-- Plans
CREATE POLICY "Members can view plans" ON public.plans FOR SELECT TO authenticated USING (public.is_group_member(group_id));
CREATE POLICY "Members can create plans" ON public.plans FOR INSERT TO authenticated WITH CHECK (public.is_group_member(group_id) AND auth.uid() = created_by);
CREATE POLICY "Creator can update plan" ON public.plans FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator can delete plan" ON public.plans FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- RSVPs
CREATE POLICY "Members can view rsvps" ON public.rsvps FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_id AND public.is_group_member(plans.group_id))
);
CREATE POLICY "Members can rsvp" ON public.rsvps FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_id AND public.is_group_member(plans.group_id))
);
CREATE POLICY "User can update own rsvp" ON public.rsvps FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User can delete own rsvp" ON public.rsvps FOR DELETE TO authenticated USING (auth.uid() = user_id);
