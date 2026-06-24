import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { auth } from "@/auth";

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
      <LoginForm callbackUrl={safePath(callbackUrl)} />
    </main>
  );
}
