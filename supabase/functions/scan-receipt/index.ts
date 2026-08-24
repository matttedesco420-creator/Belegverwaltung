// Supabase Edge Function: scan-receipt
// Nimmt Beleg-Seitenbilder entgegen, ruft die Anthropic-API mit dem SERVERSEITIG
// gespeicherten API-Key auf und gibt nur das extrahierte JSON zurueck.
// Der Anthropic-Key verlaesst niemals den Server.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // --- 1. Nutzer authentifizieren: nur angemeldete Nutzer duerfen scannen ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Nicht angemeldet." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Ungueltige Sitzung." }, 401);

    // --- 2. Eingabe pruefen ---
    const body = await req.json();
    const images: string[] = body.images ?? [];
    const categories: string[] = body.categories ?? [];

    if (!Array.isArray(images) || images.length === 0) {
      return json({ error: "Keine Bilddaten empfangen." }, 400);
    }
    if (images.length > 8) {
      return json({ error: "Zu viele Seiten (max. 8)." }, 400);
    }
    // Grobes Groessenlimit gegen Missbrauch: ~8 MB Base64 gesamt
    const totalSize = images.reduce((s, i) => s + (i?.length ?? 0), 0);
    if (totalSize > 8_000_000) {
      return json({ error: "Bilddaten zu gross." }, 413);
    }

    const catList = (categories.length ? categories : ["Verpflegung", "Hotel", "Treibstoff", "Sonstiges"])
      .map((c) => `"${c}"`).join(" | ");

    const prompt = `Du bekommst ein oder mehrere Fotos/Seiten EINES EINZELNEN Kassenbelegs oder EINER Rechnung von einer Geschaeftsreise (bei mehrseitigen PDF-Rechnungen z.B. Deckblatt, Positionsliste, Summenseite). Werte ALLE gegebenen Seiten gemeinsam als zusammenhaengendes Dokument aus — z.B. steht der Gesamtbetrag oft erst auf der letzten Seite. Extrahiere folgende Angaben und antworte AUSSCHLIESSLICH mit einem reinen JSON-Objekt, ohne Erklaerung, ohne Markdown-Codeblock:

{
  "datum": "TT.MM.JJJJ",
  "unternehmen": "Name des Geschaefts/Restaurants/Hotels/Tankstelle",
  "betrag_original": 12.34,
  "waehrung_original": "EUR",
  "kategorie": "eine der folgenden Kategorien",
  "kurs_zu_eur": 1.0,
  "betrag_eur": 12.34,
  "unsicher": false,
  "hinweis": ""
}

Fuer "kategorie" MUSS exakt einer dieser Werte verwendet werden: ${catList}
Waehle die inhaltlich am besten passende Kategorie. Wenn keine wirklich passt, nimm die Kategorie, die am ehesten "Sonstiges" oder "Verschiedenes" entspricht (bzw. die letzte in der Liste, falls keine so heisst).

Wenn die Waehrung bereits EUR ist: kurs_zu_eur = 1.0 und betrag_eur = betrag_original.
Wenn die Waehrung NICHT EUR ist: schaetze den ungefaehren aktuellen Wechselkurs anhand deines Wissens, berechne betrag_eur = betrag_original * kurs_zu_eur (auf 2 Nachkommastellen), und setze "hinweis" auf "Wechselkurs geschaetzt, bitte pruefen".
Wenn ein Feld nicht lesbar ist, setze es auf null und "unsicher": true, mit kurzem Hinweis warum.
Antworte NUR mit dem JSON-Objekt, keinem weiteren Text.`;

    // --- 3. Anthropic mit serverseitigem Key aufrufen ---
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return json({ error: "Server: ANTHROPIC_API_KEY fehlt." }, 500);

    const content = [
      ...images.map((b64) => ({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: b64 },
      })),
      { type: "text", text: prompt },
    ];

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [{ role: "user", content }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Anthropic-Fehler:", aiRes.status, errText.slice(0, 500));
      // Details bewusst NICHT an den Client durchreichen
      return json({ error: "Auslesen fehlgeschlagen (Status " + aiRes.status + ")." }, 502);
    }

    const data = await aiRes.json();
    const textBlock = (data.content ?? []).find((b: any) => b.type === "text");
    if (!textBlock) return json({ error: "Keine verwertbare Antwort." }, 502);

    let jsonStr = String(textBlock.text).trim()
      .replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return json({ error: "Antwort konnte nicht gelesen werden." }, 502);
    }

    return json(parsed);
  } catch (e) {
    console.error(e);
    return json({ error: "Unerwarteter Serverfehler." }, 500);
  }
});
