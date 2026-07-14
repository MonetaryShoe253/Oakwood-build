import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { DEMO_MODE } from "@/lib/demo";

export const metadata = { title: "Staff sign in — Oakwood Maintenance" };

function safePath(value: string | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  if (session?.user) redirect(safePath(callbackUrl));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Staff sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Oakwood Property Management — maintenance dashboard.
        </p>
      </header>

      {DEMO_MODE ? (
        <div className="mb-6 rounded-lg border border-input bg-muted/30 p-4 text-sm">
          <p className="font-medium">This is a public demo.</p>
          <p className="mt-1 text-muted-foreground">
            Sign-in is optional here — the dashboard is open so you can explore
            everything. Real credential auth (Auth.js + argon2id) still ships in
            the app and can be switched back on.
          </p>
          <Link
            href="/dashboard"
            className={`${buttonVariants({ size: "sm" })} mt-3`}
          >
            Continue to dashboard →
          </Link>
        </div>
      ) : null}

      <LoginForm callbackUrl={safePath(callbackUrl)} />
    </main>
  );
}
