import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="text-muted-foreground mt-2 text-[15px]">
        We will email you a link to choose a new one.
      </p>

      <ForgotPasswordForm />

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link href="/login" className="hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
