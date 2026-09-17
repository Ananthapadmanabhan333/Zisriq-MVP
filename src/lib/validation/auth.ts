import { z } from "zod";

/**
 * Input shapes for the auth flows. Every server action parses with these before
 * doing anything, so an action can assume its input is well-formed.
 */

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "That email is too long")
  .pipe(z.email("Enter a valid email address"))
  .transform((v) => v.toLowerCase());

/**
 * Length is the only rule. Composition requirements ("one symbol, one digit")
 * push people towards `Password1!` and towards reuse; length does more for
 * strength and is easier to comply with honestly. Supabase enforces a minimum
 * of its own — keep this at or above it.
 */
const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Passwords cannot exceed 72 characters");

const fullName = z.string().trim().min(2, "Enter your name").max(120, "That name is too long");

export const signUpSchema = z.object({
  fullName,
  email,
  password,
  next: z.string().optional(),
});

export const loginSchema = z.object({
  email,
  // Not re-validated for length: an old account may predate the current rule,
  // and telling someone their existing password is "too short" at sign-in is
  // both useless and a disclosure.
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
