"use client";

import {
  Archive,
  ExternalLink,
  Grid2X2,
  ImagePlus,
  Layers3,
  Link2,
  LogIn,
  LogOut,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Settings,
  Shuffle,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { extractImageText, extractVisualEmbedding } from "@/lib/local-ai";

type ViewMode = "everything" | "spaces" | "serendipity";
type MindKind =
  | "link"
  | "image"
  | "note"
  | "article"
  | "quote"
  | "document"
  | "video"
  | "product"
  | "book"
  | "repository"
  | "palette"
  | "other";

type MindObject = {
  id: string;
  kind: MindKind;
  title: string;
  source_url?: string | null;
  content?: string | null;
  summary?: string | null;
  metadata: Record<string, unknown>;
  palette: unknown[];
  blob_path?: string | null;
  thumbnail_path?: string | null;
  pinned: boolean;
  pin_order?: number | null;
  sensitive: boolean;
  bumped_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  preview_url?: string | null;
  enrichment_status?: "queued" | "processing" | "ready" | "error";
  visual_embedding?: number[] | string | null;
};

type Space = {
  id: string;
  name: string;
  smart_query?: string | null;
  accent?: string | null;
};

const LOCAL_OBJECTS = "bea-mind:objects:v2";
const LOCAL_SPACES = "bea-mind:spaces:v1";

const now = new Date().toISOString();

const DEMO_OBJECTS: MindObject[] = [
  {
    id: "demo-1",
    kind: "image",
    title: "Brutalist chair study",
    summary: "A sculptural chair reference with hard chrome edges and deep shadow.",
    metadata: {
      image: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1000&q=82",
      tags: ["furniture", "chrome", "brutalism"],
      hue: 34,
    },
    palette: ["#d7c8b2", "#4f4840", "#171717"],
    pinned: false,
    sensitive: false,
    bumped_at: now,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-2",
    kind: "quote",
    title: "A thought worth keeping",
    content: "The best systems disappear behind the feeling that you simply remembered at the right moment.",
    metadata: { tags: ["memory", "design", "systems"], hue: 18 },
    palette: [],
    pinned: true,
    pin_order: 1,
    sensitive: false,
    bumped_at: now,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-3",
    kind: "article",
    title: "Why visual memory changes research",
    summary: "Research becomes less about filing and more about recognition, association and retrieval.",
    source_url: "https://example.com/visual-memory",
    metadata: {
      domain: "example.com",
      image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1000&q=82",
      tags: ["research", "reading"],
      hue: 42,
    },
    palette: ["#e8e2d8", "#5d574e"],
    pinned: false,
    sensitive: false,
    bumped_at: now,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-4",
    kind: "note",
    title: "Product idea",
    content: "A research inbox that quietly notices recurring themes before I do. No folders. No maintenance. Just patterns.",
    metadata: { tags: ["idea", "product"], hue: 52 },
    palette: ["#fff5a8"],
    pinned: false,
    sensitive: false,
    bumped_at: now,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-5",
    kind: "image",
    title: "Cobalt archive",
    metadata: {
      image: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=82",
      tags: ["blue", "art", "texture"],
      hue: 218,
    },
    palette: ["#1f4b99", "#9ab7df", "#101b35"],
    pinned: false,
    sensitive: false,
    bumped_at: now,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-6",
    kind: "product",
    title: "A tiny speaker I actually like",
    summary: "Saved because the interface is almost aggressively simple.",
    metadata: {
      image: "https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=1000&q=82",
      price: "£129",
      tags: ["product", "industrial design"],
      hue: 21,
    },
    palette: ["#dfd7cf", "#222222"],
    pinned: false,
    sensitive: false,
    bumped_at: now,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-7",
    kind: "palette",
    title: "Soft machinery",
    metadata: { tags: ["palette", "colour"], hue: 11 },
    palette: ["#ff5b35", "#e8d9c4", "#83988e", "#29313a"],
    pinned: false,
    sensitive: false,
    bumped_at: now,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-8",
    kind: "book",
    title: "Ways of Seeing",
    summary: "Saved for the sections on reproduction, looking and ownership.",
    metadata: {
      image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1000&q=82",
      tags: ["book", "art", "seeing"],
      hue: 8,
    },
    palette: ["#c7553f", "#efe2ca"],
    pinned: false,
    sensitive: false,
    bumped_at: now,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-9",
    kind: "repository",
    title: "A beautiful tiny open-source tool",
    summary: "Worth revisiting for its approach to local-first indexing.",
    source_url: "https://github.com/example/example",
    metadata: { domain: "github.com", tags: ["github", "open source", "research"], hue: 232 },
    palette: [],
    pinned: false,
    sensitive: false,
    bumped_at: now,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-10",
    kind: "image",
    title: "Quiet interior",
    metadata: {
      image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=82",
      tags: ["interior", "light", "architecture"],
      hue: 30,
    },
    palette: ["#c8bbad", "#806e5d", "#f1eee9"],
    pinned: false,
    sensitive: false,
    bumped_at: now,
    created_at: now,
    updated_at: now,
  },
];

const DEFAULT_SPACES: Space[] = [
  { id: "space-images", name: "Visual references", smart_query: "type:image", accent: "#ef5a33" },
  { id: "space-reading", name: "Reading", smart_query: "type:article", accent: "#8aa8a0" },
  { id: "space-ideas", name: "Ideas", smart_query: "type:note", accent: "#e0c65f" },
];

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function tagsFor(item: MindObject) {
  return Array.isArray(item.metadata?.tags)
    ? item.metadata.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
}

function hueFor(item: MindObject) {
  const raw = item.metadata?.hue;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  let total = 0;
  for (const char of item.title) total = (total + char.charCodeAt(0) * 13) % 360;
  return total;
}

function hueDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

function vectorFor(item: MindObject) {
  const value = item.visual_embedding ?? item.metadata?.visualEmbedding;
  if (Array.isArray(value)) {
    return value.filter((entry): entry is number => typeof entry === "number");
  }
  return null;
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return null;
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  const denom = Math.sqrt(aa) * Math.sqrt(bb);
  return denom ? dot / denom : null;
}

function matchesQuery(item: MindObject, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const terms = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const searchable = [
    item.title,
    item.summary ?? "",
    item.content ?? "",
    item.source_url ?? "",
    asString(item.metadata?.domain),
    ...tagsFor(item),
  ]
    .join(" ")
    .toLowerCase();

  return terms.every((rawTerm) => {
    const term = rawTerm.replace(/^"|"$/g, "");
    if (!term) return true;

    if (term.startsWith("type:")) {
      return item.kind === term.slice(5).toLowerCase();
    }
    if (term.startsWith("tag:")) {
      const tag = term.slice(4).toLowerCase();
      return tagsFor(item).some((value) => value.toLowerCase().includes(tag));
    }
    if (term.startsWith("#")) {
      const tag = term.slice(1).toLowerCase();
      return tagsFor(item).some((value) => value.toLowerCase().includes(tag));
    }
    if (term.startsWith("domain:")) {
      return asString(item.metadata?.domain).toLowerCase().includes(term.slice(7).toLowerCase());
    }
    return searchable.includes(term.toLowerCase());
  });
}

function normaliseRow(row: Record<string, unknown>): MindObject {
  return {
    id: String(row.id),
    kind: (row.kind as MindKind) ?? "other",
    title: String(row.title ?? ""),
    source_url: (row.source_url as string | null) ?? null,
    content: (row.content as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    palette: Array.isArray(row.palette) ? row.palette : [],
    blob_path: (row.blob_path as string | null) ?? null,
    thumbnail_path: (row.thumbnail_path as string | null) ?? null,
    pinned: Boolean(row.pinned),
    pin_order: (row.pin_order as number | null) ?? null,
    sensitive: Boolean(row.sensitive),
    bumped_at: String(row.bumped_at ?? now),
    created_at: String(row.created_at ?? now),
    updated_at: String(row.updated_at ?? now),
    deleted_at: (row.deleted_at as string | null) ?? null,
    enrichment_status:
      (row.enrichment_status as MindObject["enrichment_status"]) ?? "ready",
    visual_embedding:
      (row.visual_embedding as MindObject["visual_embedding"]) ?? null,
  };
}

async function compactImage(file: File) {
  const source = URL.createObjectURL(file);
  try {
    const image = document.createElement("img");
    image.decoding = "async";
    image.src = source;
    await image.decode();

    const scale = Math.min(1, 1100 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable.");
    ctx.drawImage(image, 0, 0, width, height);

    const sample = ctx.getImageData(
      0,
      0,
      Math.min(width, 140),
      Math.min(height, 140),
    ).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < sample.length; i += 16) {
      r += sample[i];
      g += sample[i + 1];
      b += sample[i + 2];
      count++;
    }
    r /= count || 1;
    g /= count || 1;
    b /= count || 1;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }

    return {
      preview: canvas.toDataURL("image/jpeg", 0.82),
      hue: Math.round(h),
      palette: [
        `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`,
      ],
    };
  } finally {
    URL.revokeObjectURL(source);
  }
}

function MindCard({
  item,
  onOpen,
  onPin,
  onVibe,
}: {
  item: MindObject;
  onOpen: () => void;
  onPin: () => void;
  onVibe: () => void;
}) {
  const image = item.preview_url || asString(item.metadata?.image);
  const domain = asString(item.metadata?.domain);
  const price = asString(item.metadata?.price);

  return (
    <article className={`mind-card mind-card--${item.kind}`} onClick={onOpen}>
      <div className="mind-card__actions" onClick={(event) => event.stopPropagation()}>
        <button type="button" aria-label={item.pinned ? "Unpin" : "Pin"} onClick={onPin}>
          <Pin size={14} fill={item.pinned ? "currentColor" : "none"} />
        </button>
        {(item.kind === "image" || image) && (
          <button type="button" aria-label="Same vibe" onClick={onVibe}>
            <Sparkles size={14} />
          </button>
        )}
      </div>

      {item.kind === "palette" ? (
        <div className="palette-card">
          <div className="palette-card__swatches">
            {(item.palette as string[]).map((color) => (
              <span key={color} style={{ background: color }} />
            ))}
          </div>
          <p>{item.title}</p>
        </div>
      ) : item.kind === "note" ? (
        <div className="note-card">
          <div className="note-card__tape" />
          <p className="note-card__eyebrow">Quick note</p>
          <h3>{item.title}</h3>
          <p>{item.content}</p>
        </div>
      ) : item.kind === "quote" ? (
        <div className="quote-card">
          <span>“</span>
          <p>{item.content}</p>
          <small>{item.title}</small>
        </div>
      ) : image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mind-card__image" src={image} alt="" loading="lazy" />
          <div className="mind-card__caption">
            <div>
              {domain && <span className="mind-card__domain">{domain}</span>}
              <h3>{item.title}</h3>
            </div>
            {price && <strong>{price}</strong>}
          </div>
        </>
      ) : (
        <div className="text-card">
          <div className="text-card__icon">
            {item.kind === "repository" ? "git" : item.kind}
          </div>
          <h3>{item.title}</h3>
          {item.summary && <p>{item.summary}</p>}
          {domain && <small>{domain}</small>}
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const [objects, setObjects] = useState<MindObject[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<ViewMode>("everything");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MindObject | null>(null);
  const [vibeSource, setVibeSource] = useState<MindObject | null>(null);
  const [vibeResults, setVibeResults] = useState<MindObject[] | null>(null);
  const [serendipityId, setSerendipityId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [addMode, setAddMode] = useState<"link" | "note" | "image">("link");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftText, setDraftText] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => getSupabase(), []);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const hydrateMedia = useCallback(
    async (items: MindObject[], activeSession: Session | null = session) => {
      if (!supabase || !activeSession) return items;
      return Promise.all(
        items.map(async (item) => {
          if (!item.blob_path) return item;
          const { data } = await supabase.storage
            .from("mind-media")
            .createSignedUrl(item.blob_path, 3600);
          return { ...item, preview_url: data?.signedUrl ?? null };
        }),
      );
    },
    [session, supabase],
  );

  const loadCloud = useCallback(
    async (activeSession: Session) => {
      if (!supabase) return;
      const [{ data: objectRows, error: objectError }, { data: spaceRows }] =
        await Promise.all([
          supabase
            .from("mind_objects")
            .select("*")
            .is("deleted_at", null)
            .order("pinned", { ascending: false })
            .order("bumped_at", { ascending: false }),
          supabase
            .from("mind_spaces")
            .select("id,name,smart_query,accent")
            .order("created_at", { ascending: true }),
        ]);

      if (objectError) {
        notify(objectError.message);
        return;
      }

      setSession(activeSession);
      setObjects(
        await hydrateMedia(
          (objectRows ?? []).map((row) => normaliseRow(row as Record<string, unknown>)),
          activeSession,
        ),
      );
      setSpaces((spaceRows ?? []) as Space[]);
    },
    [hydrateMedia, notify, supabase],
  );

  useEffect(() => {
    const storedObjects = window.localStorage.getItem(LOCAL_OBJECTS);
    const storedSpaces = window.localStorage.getItem(LOCAL_SPACES);
    setObjects(storedObjects ? JSON.parse(storedObjects) : DEMO_OBJECTS);
    setSpaces(storedSpaces ? JSON.parse(storedSpaces) : DEFAULT_SPACES);

    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void loadCloud(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, active) => {
      setSession(active);
      if (active) void loadCloud(active);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadCloud, supabase]);

  useEffect(() => {
    if (!session && objects.length) {
      window.localStorage.setItem(LOCAL_OBJECTS, JSON.stringify(objects));
    }
  }, [objects, session]);

  useEffect(() => {
    if (!session && spaces.length) {
      window.localStorage.setItem(LOCAL_SPACES, JSON.stringify(spaces));
    }
  }, [session, spaces]);

  const visibleObjects = useMemo(() => {
    let result = objects.filter((item) => !item.deleted_at);

    if (vibeSource) {
      if (vibeResults) {
        result = vibeResults;
      } else {
        const sourceHue = hueFor(vibeSource);
        const sourceTags = new Set(tagsFor(vibeSource).map((tag) => tag.toLowerCase()));
        const sourceVector = vectorFor(vibeSource);
        result = result
          .filter((item) => item.id !== vibeSource.id)
          .map((item) => {
            const sharedTags = tagsFor(item).filter((tag) =>
              sourceTags.has(tag.toLowerCase()),
            ).length;
            const candidateVector = vectorFor(item);
            const visualSimilarity =
              sourceVector && candidateVector
                ? cosineSimilarity(sourceVector, candidateVector)
                : null;
            const score =
              visualSimilarity === null
                ? hueDistance(sourceHue, hueFor(item)) - sharedTags * 24
                : (1 - visualSimilarity) * 1000 - sharedTags * 8;
            return { item, score };
          })
          .sort((a, b) => a.score - b.score)
          .slice(0, 30)
          .map(({ item }) => item);
      }
    } else {
      result = result.filter((item) => matchesQuery(item, query));
    }

    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.pinned && b.pinned) return (a.pin_order ?? 999) - (b.pin_order ?? 999);
      return new Date(b.bumped_at).getTime() - new Date(a.bumped_at).getTime();
    });
  }, [objects, query, vibeResults, vibeSource]);

  const serendipity =
    objects.find((item) => item.id === serendipityId) ??
    objects.find((item) => !item.deleted_at) ??
    null;

  function openSerendipity() {
    const pool = objects.filter((item) => !item.deleted_at);
    if (!pool.length) return;
    setSerendipityId(pool[Math.floor(Math.random() * pool.length)].id);
    setView("serendipity");
  }

  async function persistObject(draft: Partial<MindObject>) {
    const timestamp = new Date().toISOString();
    if (session && supabase) {
      const payload = {
        user_id: session.user.id,
        kind: draft.kind ?? "other",
        title: draft.title ?? "",
        source_url: draft.source_url ?? null,
        content: draft.content ?? null,
        summary: draft.summary ?? null,
        metadata: draft.metadata ?? {},
        palette: draft.palette ?? [],
        blob_path: draft.blob_path ?? null,
        enrichment_status: draft.enrichment_status ?? "ready",
        visual_embedding: draft.visual_embedding ?? null,
        pinned: false,
        sensitive: false,
        bumped_at: timestamp,
      };

      const { data, error } = await supabase
        .from("mind_objects")
        .insert(payload)
        .select("*")
        .single();

      if (error?.code === "23505" && payload.source_url) {
        const { data: existing } = await supabase
          .from("mind_objects")
          .update({ bumped_at: timestamp })
          .eq("user_id", session.user.id)
          .eq("source_url", payload.source_url)
          .select("*")
          .single();
        if (existing) {
          const hydrated = (await hydrateMedia([
            normaliseRow(existing as Record<string, unknown>),
          ]))[0];
          setObjects((current) => [
            hydrated,
            ...current.filter((item) => item.id !== hydrated.id),
          ]);
          return hydrated;
        }
      }

      if (error) throw error;
      const hydrated = (await hydrateMedia([
        normaliseRow(data as Record<string, unknown>),
      ]))[0];
      setObjects((current) => [hydrated, ...current]);
      return hydrated;
    }

    const item: MindObject = {
      id: crypto.randomUUID(),
      kind: draft.kind ?? "other",
      title: draft.title ?? "",
      source_url: draft.source_url ?? null,
      content: draft.content ?? null,
      summary: draft.summary ?? null,
      metadata: draft.metadata ?? {},
      palette: draft.palette ?? [],
      blob_path: draft.blob_path ?? null,
      thumbnail_path: null,
      pinned: false,
      pin_order: null,
      sensitive: false,
      bumped_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
      preview_url: draft.preview_url ?? null,
      enrichment_status: draft.enrichment_status ?? "ready",
      visual_embedding: draft.visual_embedding ?? null,
    };
    setObjects((current) => [item, ...current]);
    return item;
  }

  async function saveDraft() {
    setSaving(true);
    try {
      if (addMode === "link") {
        if (!draftUrl.trim()) throw new Error("Paste a URL first.");
        const response = await fetch("/api/ingest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: draftUrl.trim() }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not save that page.");

        await persistObject({
          kind: "article",
          title: data.title,
          source_url: data.url,
          summary: data.description,
          metadata: {
            image: data.image,
            domain: data.domain,
            tags: ["saved"],
            hue: Math.abs(String(data.title).split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0)) % 360,
          },
        });
      } else if (addMode === "note") {
        const text = draftText.trim();
        if (!text) throw new Error("Write something first.");
        await persistObject({
          kind: "note",
          title: text.split("\n")[0].slice(0, 72),
          content: text,
          metadata: { tags: ["note"], hue: 51 },
          palette: ["#fff5a8"],
        });
      }

      setAddOpen(false);
      setDraftUrl("");
      setDraftText("");
      notify(session ? "Saved to your mind." : "Saved locally on this device.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  async function enrichImage(objectId: string, file: File) {
    setObjects((current) =>
      current.map((item) =>
        item.id === objectId ? { ...item, enrichment_status: "processing" } : item,
      ),
    );

    const [ocrResult, embeddingResult] = await Promise.allSettled([
      extractImageText(file),
      extractVisualEmbedding(file),
    ]);

    const ocrText =
      ocrResult.status === "fulfilled" ? ocrResult.value.trim() : "";
    const embedding =
      embeddingResult.status === "fulfilled" ? embeddingResult.value : null;
    const warnings = [
      ocrResult.status === "rejected" ? "ocr" : null,
      embeddingResult.status === "rejected" ? "visual-embedding" : null,
    ].filter(Boolean);

    setObjects((current) =>
      current.map((item) => {
        if (item.id !== objectId) return item;
        return {
          ...item,
          content: ocrText || item.content,
          visual_embedding: embedding ?? item.visual_embedding,
          enrichment_status: warnings.length === 2 ? "error" : "ready",
          metadata: {
            ...item.metadata,
            ...(ocrText ? { ocrText } : {}),
            ...(embedding ? { visualEmbedding: embedding } : {}),
            ...(warnings.length ? { enrichmentWarnings: warnings } : {}),
          },
        };
      }),
    );

    if (session && supabase) {
      const { data: current } = await supabase
        .from("mind_objects")
        .select("metadata,content")
        .eq("id", objectId)
        .single();

      const nextMetadata = {
        ...((current?.metadata as Record<string, unknown> | null) ?? {}),
        ...(ocrText ? { ocrText } : {}),
        ...(warnings.length ? { enrichmentWarnings: warnings } : {}),
      };

      const { error } = await supabase
        .from("mind_objects")
        .update({
          content: ocrText || current?.content || null,
          visual_embedding: embedding,
          enrichment_status: warnings.length === 2 ? "error" : "ready",
          metadata: nextMetadata,
        })
        .eq("id", objectId);

      if (error) {
        notify(`Image saved, but enrichment could not sync: ${error.message}`);
        return;
      }
    }

    if (ocrText && embedding) {
      notify("Image indexed for text search and Same Vibe.");
    } else if (ocrText) {
      notify("Image text indexed. Visual similarity fell back gracefully.");
    } else if (embedding) {
      notify("Image indexed for Same Vibe.");
    }
  }

  async function saveImage(file: File) {
    setSaving(true);
    try {
      const compact = await compactImage(file);
      let blobPath: string | null = null;
      if (session && supabase) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
        blobPath = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage
          .from("mind-media")
          .upload(blobPath, file, { upsert: false, contentType: file.type });
        if (error) throw error;
      }

      const item = await persistObject({
        kind: "image",
        title: file.name.replace(/\.[^.]+$/, ""),
        metadata: { tags: ["image"], hue: compact.hue },
        palette: compact.palette,
        blob_path: blobPath,
        preview_url: compact.preview,
        enrichment_status: "queued",
      });
      setObjects((current) =>
        current.map((candidate) =>
          candidate.id === item.id ? { ...candidate, preview_url: compact.preview } : candidate,
        ),
      );
      setAddOpen(false);
      notify(session ? "Image saved. Local AI indexing has started." : "Image saved locally. Local AI indexing has started.");
      void enrichImage(item.id, file);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to save image.");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function togglePin(item: MindObject) {
    const next = !item.pinned;
    setObjects((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, pinned: next } : candidate,
      ),
    );
    if (session && supabase) {
      const { error } = await supabase
        .from("mind_objects")
        .update({ pinned: next, pin_order: next ? 0 : null })
        .eq("id", item.id);
      if (error) notify(error.message);
    }
  }

  async function softDelete(item: MindObject) {
    const timestamp = new Date().toISOString();
    setObjects((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, deleted_at: timestamp } : candidate,
      ),
    );
    setSelected(null);
    if (session && supabase) {
      const { error } = await supabase
        .from("mind_objects")
        .update({ deleted_at: timestamp })
        .eq("id", item.id);
      if (error) notify(error.message);
    }
    notify("Moved out of view. Cloud items remain restorable for 30 days.");
  }

  async function saveCurrentSearchAsSpace() {
    const value = query.trim();
    if (!value) {
      notify("Search for something first, then save it as a Smart Space.");
      return;
    }
    const name = value.replace(/^(type:|tag:|#)/, "") || "New space";

    if (session && supabase) {
      const { data, error } = await supabase
        .from("mind_spaces")
        .insert({ user_id: session.user.id, name, smart_query: value, accent: "#ef5a33" })
        .select("id,name,smart_query,accent")
        .single();
      if (error) {
        notify(error.message);
        return;
      }
      setSpaces((current) => [...current, data as Space]);
    } else {
      setSpaces((current) => [
        ...current,
        { id: crypto.randomUUID(), name, smart_query: value, accent: "#ef5a33" },
      ]);
    }
    notify("Smart Space saved.");
  }

  async function handleAuth() {
    if (!supabase) {
      setAuthMessage("Supabase is not configured on this deployment yet.");
      return;
    }
    setAuthMessage("");
    if (!authEmail || authPassword.length < 6) {
      setAuthMessage("Enter an email and a password of at least six characters.");
      return;
    }

    if (authMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) setAuthMessage(error.message);
      else setAuthOpen(false);
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) setAuthMessage(error.message);
      else setAuthMessage("Account created. Check your email if confirmation is enabled.");
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    const stored = window.localStorage.getItem(LOCAL_OBJECTS);
    setObjects(stored ? JSON.parse(stored) : DEMO_OBJECTS);
    setSpaces(
      window.localStorage.getItem(LOCAL_SPACES)
        ? JSON.parse(window.localStorage.getItem(LOCAL_SPACES) as string)
        : DEFAULT_SPACES,
    );
  }

  async function openVibe(item: MindObject) {
    setVibeSource(item);
    setVibeResults(null);
    setQuery("");
    setSelected(null);
    setView("everything");

    if (session && supabase && !item.id.startsWith("demo-")) {
      const { data, error } = await supabase.rpc("mind_similar_objects", {
        source_object_id: item.id,
        match_count: 40,
      });

      if (!error && data?.length) {
        const hydrated = await hydrateMedia(
          data.map((row: Record<string, unknown>) => normaliseRow(row)),
        );
        setVibeResults(hydrated);
      }
    }
  }

  return (
    <main className="mind-shell">
      <aside className="mind-sidebar" aria-label="Primary">
        <button className="mind-mark" aria-label="Everything" onClick={() => { setView("everything"); setVibeSource(null); setVibeResults(null); }}>
          <span /><span /><span /><span />
        </button>

        <nav>
          <button className={view === "everything" ? "active" : ""} onClick={() => { setView("everything"); setVibeSource(null); setVibeResults(null); }} aria-label="Everything">
            <Grid2X2 size={18} />
            <span>Everything</span>
          </button>
          <button className={view === "spaces" ? "active" : ""} onClick={() => setView("spaces")} aria-label="Spaces">
            <Layers3 size={18} />
            <span>Spaces</span>
          </button>
          <button className={view === "serendipity" ? "active" : ""} onClick={openSerendipity} aria-label="Serendipity">
            <Shuffle size={18} />
            <span>Serendipity</span>
          </button>
        </nav>

        <div className="mind-sidebar__bottom">
          <button aria-label="Settings"><Settings size={17} /><span>Settings</span></button>
          {session ? (
            <button aria-label="Sign out" onClick={signOut}><LogOut size={17} /><span>Sign out</span></button>
          ) : (
            <button aria-label="Sign in" onClick={() => setAuthOpen(true)}><LogIn size={17} /><span>Sync</span></button>
          )}
        </div>
      </aside>

      <header className="mind-header">
        <div className="mind-search">
          <Search size={17} />
          <input
            aria-label="Search my mind"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setVibeSource(null); setVibeResults(null); setView("everything"); }}
            placeholder={vibeSource ? `Same vibe as “${vibeSource.title}”` : "Search my mind..."}
          />
          {(query || vibeSource) && (
            <button aria-label="Clear search" onClick={() => { setQuery(""); setVibeSource(null); setVibeResults(null); }}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="mind-header__status">
          <span>{session ? "Synced" : "Private guest"}</span>
          <button className="add-button" onClick={() => setAddOpen(true)} aria-label="Add to my mind">
            <Plus size={22} />
          </button>
        </div>
      </header>

      <section className="mind-content">
        {view === "everything" && (
          <>
            {vibeSource && (
              <div className="vibe-banner">
                <Sparkles size={16} />
                <span>Same Vibe</span>
                <strong>{vibeSource.title}</strong>
                <button onClick={() => { setVibeSource(null); setVibeResults(null); }}>Done</button>
              </div>
            )}
            <div className="masonry">
              {visibleObjects.map((item) => (
                <MindCard
                  key={item.id}
                  item={item}
                  onOpen={() => setSelected(item)}
                  onPin={() => void togglePin(item)}
                  onVibe={() => openVibe(item)}
                />
              ))}
            </div>
            {!visibleObjects.length && (
              <div className="empty-state">
                <Search size={28} />
                <h2>Nothing surfaced for that thought.</h2>
                <p>Try a looser phrase, a tag such as <code>#design</code>, or a type like <code>type:image</code>.</p>
              </div>
            )}
          </>
        )}

        {view === "spaces" && (
          <div className="spaces-page">
            <div className="page-title">
              <p>Collections without filing</p>
              <h1>Spaces</h1>
              <span>Smart Spaces are saved searches. New matching things appear automatically.</span>
            </div>
            <div className="spaces-grid">
              {spaces.map((space, index) => (
                <button
                  className="space-card"
                  key={space.id}
                  onClick={() => {
                    setQuery(space.smart_query ?? "");
                    setVibeSource(null); setVibeResults(null);
                    setView("everything");
                  }}
                  style={{ "--space-accent": space.accent ?? ["#ef5a33", "#8ca7a0", "#dec75f", "#b9a6cc"][index % 4] } as React.CSSProperties}
                >
                  <span className="space-card__orb" />
                  <small>Smart Space</small>
                  <h3>{space.name}</h3>
                  <p>{space.smart_query || "Manual collection"}</p>
                </button>
              ))}
              <button className="space-card space-card--new" onClick={saveCurrentSearchAsSpace}>
                <Plus size={24} />
                <h3>Save current search</h3>
                <p>{query || "Search first, then return here."}</p>
              </button>
            </div>
          </div>
        )}

        {view === "serendipity" && (
          <div className="serendipity-page">
            <div className="page-title page-title--center">
              <p>A little memory machine</p>
              <h1>Serendipity</h1>
            </div>
            {serendipity && (
              <div className="serendipity-stage">
                <div className="serendipity-card">
                  <MindCard
                    item={serendipity}
                    onOpen={() => setSelected(serendipity)}
                    onPin={() => void togglePin(serendipity)}
                    onVibe={() => openVibe(serendipity)}
                  />
                </div>
                <button className="shuffle-button" onClick={openSerendipity}>
                  <Shuffle size={16} />
                  Show me something else
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {addOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAddOpen(false)}>
          <section className="composer modal-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <small>Add to your mind</small>
                <h2>Save without sorting.</h2>
              </div>
              <button aria-label="Close" onClick={() => setAddOpen(false)}><X size={19} /></button>
            </div>

            <div className="composer-tabs">
              <button className={addMode === "link" ? "active" : ""} onClick={() => setAddMode("link")}><Link2 size={15} />Link</button>
              <button className={addMode === "note" ? "active" : ""} onClick={() => setAddMode("note")}><StickyNote size={15} />Note</button>
              <button className={addMode === "image" ? "active" : ""} onClick={() => setAddMode("image")}><ImagePlus size={15} />Image</button>
            </div>

            {addMode === "link" && (
              <div className="composer-body">
                <label>URL</label>
                <input autoFocus value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="https://..." />
                <p>The page title, description and preview image are extracted on save.</p>
                <button className="primary-action" disabled={saving} onClick={() => void saveDraft()}>
                  {saving ? "Reading page..." : "Save link"}
                </button>
              </div>
            )}

            {addMode === "note" && (
              <div className="composer-body">
                <label>Quick note</label>
                <textarea autoFocus value={draftText} onChange={(event) => setDraftText(event.target.value)} placeholder="A passing thought, idea, line, list..." rows={9} />
                <p>Guest drafts stay on this device. Signed-in notes sync through Supabase.</p>
                <button className="primary-action" disabled={saving} onClick={() => void saveDraft()}>
                  {saving ? "Saving..." : "Save note"}
                </button>
              </div>
            )}

            {addMode === "image" && (
              <div className="composer-body">
                <button className="drop-zone" onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={28} />
                  <strong>{saving ? "Preparing image..." : "Choose an image"}</strong>
                  <span>The save is immediate. OCR and visual similarity indexing continue locally after it closes.</span>
                </button>
                <input
                  ref={fileRef}
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void saveImage(file);
                  }}
                />
              </div>
            )}
          </section>
        </div>
      )}

      {authOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAuthOpen(false)}>
          <section className="auth-panel modal-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <small>Optional sync</small>
                <h2>{authMode === "signin" ? "Open your private mind." : "Create your private mind."}</h2>
              </div>
              <button aria-label="Close" onClick={() => setAuthOpen(false)}><X size={19} /></button>
            </div>
            <div className="composer-body">
              <label>Email</label>
              <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
              <label>Password</label>
              <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
              {authMessage && <p className="form-message">{authMessage}</p>}
              <button className="primary-action" onClick={() => void handleAuth()}>
                {authMode === "signin" ? "Sign in & sync" : "Create account"}
              </button>
              <button className="text-action" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthMessage(""); }}>
                {authMode === "signin" ? "Need an account?" : "Already have an account?"}
              </button>
              <p>Your browser can be used in guest mode without creating an account.</p>
            </div>
          </section>
        </div>
      )}

      {selected && (
        <div className="modal-backdrop detail-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <section className="detail-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="detail-close" aria-label="Close" onClick={() => setSelected(null)}><X size={19} /></button>
            <div className="detail-preview">
              <MindCard
                item={selected}
                onOpen={() => {}}
                onPin={() => void togglePin(selected)}
                onVibe={() => openVibe(selected)}
              />
            </div>
            <aside className="detail-meta">
              <span className="detail-kind">{selected.kind}</span>
              <h2>{selected.title}</h2>
              {selected.summary && <p>{selected.summary}</p>}
              {selected.content && selected.kind !== "note" && <p>{selected.content}</p>}
              {!!tagsFor(selected).length && (
                <div className="tag-row">
                  {tagsFor(selected).map((tag) => <span key={tag}>#{tag}</span>)}
                </div>
              )}
              <div className="detail-actions">
                <button onClick={() => void togglePin(selected)}><Pin size={15} />{selected.pinned ? "Unpin" : "Top of mind"}</button>
                {(selected.kind === "image" || asString(selected.metadata?.image)) && (
                  <button onClick={() => openVibe(selected)}><Sparkles size={15} />Same Vibe</button>
                )}
                {selected.source_url && (
                  <a href={selected.source_url} target="_blank" rel="noreferrer"><ExternalLink size={15} />Open original</a>
                )}
                <button className="danger" onClick={() => void softDelete(selected)}><Trash2 size={15} />Delete</button>
              </div>
              <small className="detail-date">Saved {new Date(selected.created_at).toLocaleDateString()}</small>
            </aside>
          </section>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
