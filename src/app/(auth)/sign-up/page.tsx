import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="text-muted-foreground mt-2 text-[15px]">
        You will set up your firm in the next step.
      </p>

      <SignUpForm />

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
