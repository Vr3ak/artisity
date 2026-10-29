import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // The provider sends error_description when the user cancels or the app is misconfigured
  const providerError =
    searchParams.get("error_description") ?? "No code provided";
  redirect(`/auth/error?error=${encodeURIComponent(providerError)}`);
}
