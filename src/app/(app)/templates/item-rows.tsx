"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/**
 * Editable list of checklist items.
 *
 * Each row submits `itemLabel` / `itemDescription` as repeated fields, and
 * `itemMandatory` carries the row index, because an unchecked checkbox submits
 * nothing at all — the index is how the server knows which row a tick belongs to.
 */
export type ItemDraft = { label: string; description: string; isMandatory: boolean };

const BLANK: ItemDraft = { label: "", description: "", isMandatory: true };

export function ItemRows({ initial, error }: { initial?: ItemDraft[]; error?: string }) {
  const [items, setItems] = useState<ItemDraft[]>(
    initial?.length ? initial : [{ ...BLANK }, { ...BLANK }, { ...BLANK }],
  );

  const update = (index: number, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-medium">Documents to collect</h2>
        <span className="text-muted-foreground text-[13px]">
          {items.filter((i) => i.label.trim()).length} item
          {items.filter((i) => i.label.trim()).length === 1 ? "" : "s"}
        </span>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="bg-surface-raised/50 ring-border/50 rounded-xl p-3 ring-1">
            <div className="flex items-center gap-2">
              <Input
                name="itemLabel"
                value={item.label}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="Bank statement — April to March"
                aria-label={`Document ${index + 1} label`}
                className="h-11"
              />
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                aria-label={`Remove document ${index + 1}`}
                className="text-muted-foreground hover:text-destructive shrink-0 p-2 transition-colors"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <Input
                name="itemDescription"
                value={item.description}
                onChange={(e) => update(index, { description: e.target.value })}
                placeholder="Optional note for the client"
                aria-label={`Document ${index + 1} note`}
                className="h-10 text-sm"
              />
              <label className="text-muted-foreground flex shrink-0 items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  name="itemMandatory"
                  value={index}
                  checked={item.isMandatory}
                  onChange={(e) => update(index, { isMandatory: e.target.checked })}
                  className="accent-primary size-4"
                />
                Required
              </label>
            </div>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setItems((prev) => [...prev, { ...BLANK }])}
      >
        <Plus className="size-4" aria-hidden />
        Add document
      </Button>
    </div>
  );
}
