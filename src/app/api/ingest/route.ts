import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 2_500_000;
const MAX_REDIRECTS = 4;

function isPrivateAddress(address: string) {
  if (address === "::1" || address === "0.0.0.0") return true;
  const lower = address.toLowerCase();
  if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:")) return true;

  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
  }

  return false;
}

async function assertPublicUrl(input: string) {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) {
    throw new Error("Local network addresses are not supported.");
  }

  if (isIP(host) && isPrivateAddress(host)) {
    throw new Error("Private network addresses are not supported.");
  }

  const resolved = await lookup(host, { all: true, verbatim: true });
  if (!resolved.length || resolved.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("This URL resolves to a private or unavailable address.");
  }

  return url;
}

function attr(html: string, property: string) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return "";
}

function decodeEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function titleFromHtml(html: string) {
  const og = attr(html, "og:title");
  if (og) return og;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  return decodeEntities(title.replace(/\s+/g, " ").trim());
}

async function fetchSafe(url: URL) {
  let current = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertPublicUrl(current.toString());
    const response = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent": "MindCapture/1.0 (+https://vercel.app)",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect response had no destination.");
      current = new URL(location, current);
      continue;
    }

    if (!response.ok) throw new Error(`The page returned HTTP ${response.status}.`);
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) {
      throw new Error("This URL is not an HTML page.");
    }

    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > MAX_HTML_BYTES) throw new Error("The page is too large to ingest safely.");

    const html = await response.text();
    if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) {
      throw new Error("The page is too large to ingest safely.");
    }

    return { response, html, finalUrl: current };
  }
  throw new Error("Too many redirects.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body?.url !== "string" || body.url.length > 4096) {
      return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
    }

    const initial = await assertPublicUrl(body.url);
    const { html, finalUrl } = await fetchSafe(initial);

    const description = attr(html, "og:description") || attr(html, "description");
    const imageValue = attr(html, "og:image") || attr(html, "twitter:image");
    const image = imageValue ? new URL(imageValue, finalUrl).toString() : null;
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
    const canonical = canonicalMatch?.[1]
      ? new URL(canonicalMatch[1], finalUrl).toString()
      : finalUrl.toString();

    return NextResponse.json({
      url: canonical,
      title: titleFromHtml(html) || finalUrl.hostname,
      description: description || null,
      image,
      domain: finalUrl.hostname.replace(/^www\./, ""),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to ingest this URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
