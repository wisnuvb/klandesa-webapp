import assert from "node:assert/strict";
import test from "node:test";
import { buildGoogleNewsRssUrl, buildGoogleNewsSearchQuery } from "../lib/regional-news/query-builder";
import { normalizeFeedItems } from "../lib/regional-news/matcher";
import { buildRegionKey } from "../lib/regional-news/region-key";

test("buildRegionKey slugifies province and regency", () => {
  const key = buildRegionKey("Jawa Barat", "Kabupaten Sukabumi");
  assert.equal(key, "jawa-barat-kabupaten-sukabumi");
});

test("buildGoogleNewsSearchQuery includes regency and province", () => {
  const q = buildGoogleNewsSearchQuery("Jawa Barat", "Kabupaten Sukabumi");
  assert.match(q, /Sukabumi/);
  assert.match(q, /Jawa Barat/);
});

test("buildGoogleNewsRssUrl uses Indonesian locale params", () => {
  const url = buildGoogleNewsRssUrl("Jawa Barat", "Kabupaten Sukabumi");
  assert.match(url, /^https:\/\/news\.google\.com\/rss\/search\?/);
  assert.match(url, /hl=id/);
  assert.match(url, /gl=ID/);
});

test("normalizeFeedItems dedups and limits metadata", () => {
  const items = normalizeFeedItems([
    {
      guid: "a",
      title: "Judul Satu - Detik.com",
      link: "https://example.com/1",
      isoDate: "2026-07-18T10:00:00.000Z",
      contentSnippet: "Ringkasan singkat",
    },
    {
      guid: "a",
      title: "Duplikat - Detik.com",
      link: "https://example.com/1",
      isoDate: "2026-07-17T10:00:00.000Z",
    },
    {
      guid: "b",
      title: "Judul Dua - Kompas.com",
      link: "https://example.com/2",
      isoDate: "2026-07-19T10:00:00.000Z",
    },
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0]?.sourceName, "Kompas.com");
  assert.equal(items[0]?.title, "Judul Dua");
});
