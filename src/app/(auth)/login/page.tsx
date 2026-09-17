import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/dashboard";

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted-foreground mt-2 text-[15px]">Welcome back.</p>

      <LoginForm next={next} />

      <p className="text-muted-foreground mt-6 text-center text-sm">
        New here?{" "}
        <Link href="/sign-up" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
