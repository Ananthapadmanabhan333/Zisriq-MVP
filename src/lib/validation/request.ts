import { z } from "zod";

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date");

export const requestItemSchema = z.object({
  label: z.string().trim().min(1, "Every item needs a label").max(200),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
  isMandatory: z.coerce.boolean().default(true),
});

export const createRequestSchema = z.object({
  clientId: z.uuid("Choose a client"),
  title: z.string().trim().min(2, "Give the request a title").max(200),
  periodLabel: z
    .string()
    .trim()
    .min(1, "Which period is this for?")
    .max(60, "Keep the period label short"),
  dueDate: optionalDate,
  assignedTo: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.uuid().safeParse(v).success, "Choose a valid assignee"),
  /** Either pick a template, or supply items directly. */
  templateId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.uuid().safeParse(v).success, "Choose a valid template"),
  items: z.array(requestItemSchema).max(60, "Sixty items is already a lot to ask of a client"),
});

export const templateSchema = z.object({
  name: z.string().trim().min(2, "Name the template").max(200),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
  items: z
    .array(requestItemSchema)
    .min(1, "A template needs at least one item")
    .max(60, "Sixty items is already a lot to ask of a client"),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
