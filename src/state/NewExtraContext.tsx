import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ExtraReason, LineItemCategory, MarkupType } from "@/types";

export interface DraftLineItem {
  localId: string;
  category: LineItemCategory;
  description: string;
  quantity: number;
  unitRateCents: number;
  amountCents: number;
}

export interface DraftPhoto {
  localId: string;
  uri: string;
  caption: string;
  takenAt: string;
}

export interface NewExtraDraft {
  /** Set when editing an existing (draft-status) change order rather than creating a new one. */
  editId: string | null;
  /** Set when an edit to an approved/paid change order must be saved as a new revision. */
  asRevision: boolean;

  jobId: string | null;
  title: string;
  description: string;
  requestedByName: string;
  requestedByCompany: string;
  requestedByRole: string;
  requestedAt: string;
  reason: ExtraReason;

  lineItems: DraftLineItem[];
  markupType: MarkupType;
  markupValue: number;
  taxEnabled: boolean;
  taxLabel: string;
  taxPercentBasisPoints: number;
  discountCents: number;

  photos: DraftPhoto[];
  siteNotes: string;
}

function emptyDraft(): NewExtraDraft {
  return {
    editId: null,
    asRevision: false,
    jobId: null,
    title: "",
    description: "",
    requestedByName: "",
    requestedByCompany: "",
    requestedByRole: "",
    requestedAt: new Date().toISOString(),
    reason: "gc_instruction",
    lineItems: [],
    markupType: "none",
    markupValue: 0,
    taxEnabled: false,
    taxLabel: "Tax",
    taxPercentBasisPoints: 0,
    discountCents: 0,
    photos: [],
    siteNotes: "",
  };
}

interface NewExtraContextValue {
  draft: NewExtraDraft;
  resetDraft: () => void;
  updateDraft: (patch: Partial<NewExtraDraft>) => void;
  movePhoto: (fromIndex: number, toIndex: number) => void;
}

const NewExtraContext = createContext<NewExtraContextValue | null>(null);

export function NewExtraProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<NewExtraDraft>(emptyDraft());

  const resetDraft = useCallback(() => setDraft(emptyDraft()), []);
  const updateDraft = useCallback((patch: Partial<NewExtraDraft>) => setDraft((d) => ({ ...d, ...patch })), []);

  const movePhoto = useCallback((fromIndex: number, toIndex: number) => {
    setDraft((d) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= d.photos.length ||
        toIndex >= d.photos.length ||
        fromIndex === toIndex
      ) {
        return d;
      }
      const next = [...d.photos];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...d, photos: next };
    });
  }, []);

  const value = useMemo(
    () => ({ draft, resetDraft, updateDraft, movePhoto }),
    [draft, resetDraft, updateDraft, movePhoto]
  );

  return <NewExtraContext.Provider value={value}>{children}</NewExtraContext.Provider>;
}

export function useNewExtra(): NewExtraContextValue {
  const ctx = useContext(NewExtraContext);
  if (!ctx) throw new Error("useNewExtra must be used within NewExtraProvider");
  return ctx;
}
