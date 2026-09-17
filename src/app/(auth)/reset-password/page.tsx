import type { Metadata } from "next";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="text-muted-foreground mt-2 text-[15px]">
        You will be signed in once it is saved.
      </p>
      <ResetPasswordForm />
    </>
  );
}
