import * as React from "react";

/** Huruf kecil dan tanpa tanda aksen, agar "Jakarta" cocok dengan "jàkarta". */
export function normalizeSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Nilai kecocokan 0..1 untuk filter dropdown. Semua kata pada `query` harus
 * ada di `haystack` (urutan bebas); awal teks dan awal kata diberi peringkat lebih tinggi.
 */
export function matchScore(haystack: string, query: string): number {
  const q = normalizeSearch(query).trim();
  if (!q) return 1;
  const h = normalizeSearch(haystack);
  const tokens = q.split(/\s+/);
  if (!tokens.every((t) => h.includes(t))) return 0;
  if (h.startsWith(q)) return 1;
  if (tokens.every((t) => h.startsWith(t) || h.includes(` ${t}`))) return 0.8;
  return 0.5;
}

/** Teks polos dari sebuah node React; dipakai untuk pencarian dan label ringkas. */
export function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (React.isValidElement(node)) {
    return nodeText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

export type NativeOption = {
  kind: "option";
  value: string;
  label: React.ReactNode;
  text: string;
  disabled: boolean;
};

export type NativeGroup = {
  kind: "group";
  label: string;
  options: NativeOption[];
};

export type NativeEntry = NativeOption | NativeGroup;

type OptionProps = {
  value?: string | number | readonly string[];
  disabled?: boolean;
  label?: string;
  children?: React.ReactNode;
};

/**
 * Membaca anak `<select>` native (`<option>`, `<optgroup>`, fragmen, hasil `.map`)
 * menjadi daftar datar. Elemen lain diabaikan, sama seperti browser.
 */
export function parseNativeOptions(children: React.ReactNode): NativeEntry[] {
  const out: NativeEntry[] = [];

  const visit = (node: React.ReactNode, into: NativeEntry[], group?: { disabled: boolean }) => {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as OptionProps & { label?: string };

      if (child.type === React.Fragment) {
        visit(props.children, into, group);
        return;
      }
      if (child.type === "option") {
        const text = (props.label ?? nodeText(props.children)).replace(/\s+/g, " ").trim();
        into.push({
          kind: "option",
          value: props.value === undefined ? text : String(props.value),
          label: props.children ?? props.label ?? text,
          text,
          disabled: Boolean(props.disabled) || Boolean(group?.disabled),
        });
        return;
      }
      if (child.type === "optgroup") {
        const options: NativeEntry[] = [];
        visit(props.children, options, { disabled: Boolean(props.disabled) });
        into.push({
          kind: "group",
          label: String(props.label ?? ""),
          options: options.filter((o): o is NativeOption => o.kind === "option"),
        });
      }
    });
  };

  visit(children, out);
  return out;
}
