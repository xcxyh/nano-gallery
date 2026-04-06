import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/types';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { extractUsernameFromEmail, normalizeEmail } from '@/utils/username';

type ProfileRecord = {
  id: string;
  name: string | null;
  role: 'user' | 'admin';
  credits: number | null;
};

type EnsureUserProfileOptions = {
  fallbackName?: string;
  role?: 'user' | 'admin';
  credits?: number;
};

export const DEFAULT_USER_CREDITS = 3;

function buildAvatar(displayName: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;
}

function getDisplayName(user: SupabaseUser, fallbackName?: string) {
  const metadataName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.user_name;

  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  if (fallbackName?.trim()) {
    return fallbackName.trim();
  }

  if (user.email) {
    return extractUsernameFromEmail(normalizeEmail(user.email));
  }

  return 'User';
}

export async function ensureUserProfile(
  user: SupabaseUser,
  options: EnsureUserProfileOptions = {}
): Promise<ProfileRecord> {
  const fallbackName = getDisplayName(user, options.fallbackName);
  const role = options.role ?? 'user';
  const credits = options.credits ?? DEFAULT_USER_CREDITS;

  const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id, name, role, credits')
    .eq('id', user.id)
    .single();

  if (existingProfile && !existingProfileError) {
    return {
      id: existingProfile.id,
      name: existingProfile.name ?? fallbackName,
      role: (existingProfile.role as 'user' | 'admin') || role,
      credits: existingProfile.credits ?? credits
    };
  }

  const profilePayload = {
    id: user.id,
    name: fallbackName,
    role,
    credits
  };

  const { data: insertedProfile, error: insertError } = await supabaseAdmin
    .from('profiles')
    .insert(profilePayload)
    .select('id, name, role, credits')
    .single();

  if (insertedProfile && !insertError) {
    return {
      id: insertedProfile.id,
      name: insertedProfile.name ?? fallbackName,
      role: (insertedProfile.role as 'user' | 'admin') || role,
      credits: insertedProfile.credits ?? credits
    };
  }

  const { data: upsertedProfile, error: upsertError } = await supabaseAdmin
    .from('profiles')
    .upsert(profilePayload)
    .select('id, name, role, credits')
    .single();

  if (upsertError || !upsertedProfile) {
    throw upsertError ?? insertError ?? new Error('Failed to ensure user profile.');
  }

  return {
    id: upsertedProfile.id,
    name: upsertedProfile.name ?? fallbackName,
    role: (upsertedProfile.role as 'user' | 'admin') || role,
    credits: upsertedProfile.credits ?? credits
  };
}

export function toAppUser(user: SupabaseUser, profile: ProfileRecord): User {
  const displayName = profile.name || getDisplayName(user);

  return {
    id: user.id,
    name: displayName,
    avatar: buildAvatar(displayName),
    role: profile.role,
    credits: profile.credits ?? DEFAULT_USER_CREDITS
  };
}

export function getProvidersForUser(user: Pick<SupabaseUser, 'app_metadata' | 'identities'>) {
  const providers = new Set<string>();

  for (const provider of user.app_metadata?.providers ?? []) {
    if (typeof provider === 'string' && provider) {
      providers.add(provider);
    }
  }

  for (const identity of user.identities ?? []) {
    if (identity.provider) {
      providers.add(identity.provider);
    }
  }

  if (user.app_metadata?.provider) {
    providers.add(user.app_metadata.provider);
  }

  return providers;
}

export async function findAuthUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  let page = 1;
  const perPage = 200;

  while (true) {
    const response = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });

    if (response.error) {
      throw response.error;
    }

    const users = response.data.users as SupabaseUser[];
    const matchedUser = users.find((user) => normalizeEmail(user.email || '') === normalizedEmail);
    if (matchedUser) {
      return matchedUser;
    }

    const nextPage = 'nextPage' in response.data ? response.data.nextPage : null;

    if (!nextPage || users.length < perPage) {
      return null;
    }

    page = nextPage;
  }
}

export function getSafeRedirectPath(
  nextPath: string | null,
  fallbackPath = '/zh',
  allowedPrefixes: string[] = []
) {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return fallbackPath;
  }

  const isAllowedPath =
    allowedPrefixes.length === 0 ||
    allowedPrefixes.some((prefix) => nextPath === prefix || nextPath.startsWith(`${prefix}/`));

  return isAllowedPath ? nextPath : fallbackPath;
}
