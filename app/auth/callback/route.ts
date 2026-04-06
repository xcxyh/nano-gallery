import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { DEFAULT_USER_CREDITS, ensureUserProfile, getSafeRedirectPath } from '@/utils/auth';
import { routing } from '@/i18n/routing';

function buildRedirectUrl(origin: string, nextPath: string, authError?: string) {
  const redirectUrl = new URL(nextPath, origin);

  if (authError) {
    redirectUrl.searchParams.set('authError', authError);
  }

  return redirectUrl;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const allowedPrefixes = routing.locales.map((locale) => `/${locale}`);
  const nextPath = getSafeRedirectPath(searchParams.get('next'), `/${routing.defaultLocale}`, allowedPrefixes);
  const oauthError = searchParams.get('error');
  const code = searchParams.get('code');

  if (oauthError) {
    const authError = oauthError === 'access_denied' ? 'oauthCancelled' : 'oauthFailed';
    return NextResponse.redirect(buildRedirectUrl(origin, nextPath, authError));
  }

  if (!code) {
    return NextResponse.redirect(buildRedirectUrl(origin, nextPath, 'oauthFailed'));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('OAuth callback exchange failed:', error);
    return NextResponse.redirect(buildRedirectUrl(origin, nextPath, 'oauthFailed'));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(buildRedirectUrl(origin, nextPath, 'oauthFailed'));
  }

  try {
    await ensureUserProfile(user, {
      role: 'user',
      credits: DEFAULT_USER_CREDITS
    });
  } catch (profileError) {
    console.error('OAuth profile sync failed:', profileError);
    return NextResponse.redirect(buildRedirectUrl(origin, nextPath, 'oauthProfileSyncFailed'));
  }

  return NextResponse.redirect(buildRedirectUrl(origin, nextPath));
}
