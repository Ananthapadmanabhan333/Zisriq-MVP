import { z } from "zod";

import { isValidGstin, isValidPan, normaliseGstin, normalisePan } from "./india";

export const CLIENT_TYPES = ["individual", "proprietorship", "partnership", "company"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const CLIENT_TYPE_LABELS: Readonly<Record<ClientType, string>> = {
  individual: "Individual",
  proprietorship: "Proprietorship",
  partnership: "Partnership",
  company: "Company",
};

/** Blank optional inputs arrive as "" from a form; store NULL, not "". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/**
 * PAN and GSTIN are checked properly, not just shaped.
 *
 * The database has a regex CHECK, which catches obvious nonsense. It cannot
 * verify the GSTIN checksum, so that happens here — a typo'd GSTIN that still
 * matches the pattern is exactly the kind of error that surfaces months later
 * during filing.
 */
const pan = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalisePan(v) : null))
  .refine((v) => v === null || isValidPan(v), "That does not look like a valid PAN");

const gstin = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normaliseGstin(v) : null))
  .refine((v) => v === null || isValidGstin(v), "That GSTIN fails its checksum — check for a typo");

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Enter the client's name").max(200, "That name is too long"),
  type: z.enum(CLIENT_TYPES, { message: "Choose a client type" }),
  pan,
  gstin,
  contactName: optionalText(120),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "Enter a valid email address"),
  contactPhone: optionalText(20),
  notes: optionalText(2000),
});

export const updateClientSchema = clientSchema.extend({ id: z.uuid() });

export type ClientInput = z.infer<typeof clientSchema>;
