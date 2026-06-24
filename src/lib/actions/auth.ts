"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";

/** Only allow same-site relative redirect targets (no open redirects). */
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  const url = typeof value === "string" ? value : "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "/dashboard";
}

/**
 * Login server action (build-spec §6). Returns an error message on bad
 * credentials; a successful sign-in throws a redirect which must propagate.
 */
export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error; // re-throw NEXT_REDIRECT and anything else
  }
  return undefined;
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
