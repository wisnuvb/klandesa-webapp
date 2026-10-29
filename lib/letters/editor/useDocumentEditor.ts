import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import type { Block, LetterDocument } from "../document/schema";
import { lintDocument } from "../document/form-spec";
import { validateDocument } from "../document/validate";
import {
  addCustomField,
  addGroupDef,
  addPersonRole,
  duplicateBlockById,
  findBlock,
  insertBlockAt,
  moveBlockByDelta,
  moveBlockTo,
  patchField,
  patchGroup,
  patchMeta,
  patchNumbering,
  patchPage,
  patchPerson,
  removeBlockById,
  updateBlockById,
  type DocResult,
} from "./ops";
import { createFromPreset } from "./presets";
import {
  fieldUsage,
  groupUsage,
  personUsage,
  removeFieldFromDoc,
  removeGroupFromDoc,
  removePersonFromDoc,
} from "./usage";
import { createEditorState, editorReducer, isDirty, type EditorAction, type EditorState } from "./history";
import type { EditorApi, EditorIssue, InsertTarget, OpResult, PresetId } from "./types";

/** Petakan path galat validasi ke id bagian: `body.<id>…` atau `body.<indeks>[.children…]`. */
export function blockIdFromPath(doc: LetterDocument, path: string): string | undefined {
  const seg = path.split(".");
  if (seg[0] !== "body" || seg.length < 2) return undefined;
  const second = seg[1];
  if (!/^\d+$/.test(second)) return findBlock(doc, second) ? second : undefined;
  const top = doc.body[Number(second)];
  if (!top) return undefined;
  if (seg[2] === "children") {
    if (top.type === "conditional" && /^\d+$/.test(seg[3] ?? "")) return top.children[Number(seg[3])]?.id ?? top.id;
    if (top.type === "columns" && /^\d+$/.test(seg[3] ?? "") && /^\d+$/.test(seg[4] ?? "")) {
      return top.children[Number(seg[3])]?.[Number(seg[4])]?.id ?? top.id;
    }
  }
  return top.id;
}

const toOp = (r: DocResult, commit: (doc: LetterDocument) => void): OpResult => {
  if (!r.ok) return { ok: false, error: r.error };
  commit(r.doc);
  return { ok: true };
};

/** Hook editor kanvas. Aman SSR (tidak memakai API peramban). */
export function useDocumentEditor(initial: LetterDocument): EditorApi {
  const [state, setState] = useState<EditorState>(() => createEditorState(initial));
  // Cermin sinkron agar fungsi yang mengembalikan id/hasil dapat membaca dokumen terbaru.
  const ref = useRef<EditorState>(state);

  const dispatch = useCallback((action: EditorAction) => {
    const next = editorReducer(ref.current, action);
    if (next !== ref.current) {
      ref.current = next;
      setState(next);
    }
  }, []);

  const apply = useCallback(
    (next: LetterDocument, extra?: { coalesceKey?: string; selectId?: string | null }) =>
      dispatch({ type: "apply", next, now: Date.now(), ...extra }),
    [dispatch],
  );

  const cur = () => ref.current.doc;

  const api = useMemo(
    () => ({
      select: (id: string | null) => dispatch({ type: "select", id }),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      markSaved: () => dispatch({ type: "markSaved" }),

      addBlock(preset: PresetId, at?: InsertTarget): string {
        const r = createFromPreset(cur(), preset, at);
        apply(r.doc, { selectId: r.blockId });
        return r.blockId;
      },
      insertBlock(block: Block, at?: InsertTarget): void {
        const r = insertBlockAt(cur(), block, at);
        if (r.ok) apply(r.doc, { selectId: block.id });
      },
      updateBlock(id: string, patch: Partial<Block> | ((b: Block) => Block)): void {
        const r = updateBlockById(cur(), id, patch);
        if (r.ok) apply(r.doc, { coalesceKey: `block:${id}` });
      },
      moveBlock: (id: string, to: InsertTarget): OpResult => toOp(moveBlockTo(cur(), id, to), (d) => apply(d)),
      moveBlockBy: (id: string, delta: -1 | 1): OpResult => toOp(moveBlockByDelta(cur(), id, delta), (d) => apply(d)),
      duplicateBlock(id: string): string | null {
        const r = duplicateBlockById(cur(), id);
        if (!r.ok) return null;
        apply(r.doc, { selectId: r.newId });
        return r.newId;
      },
      removeBlock(id: string): void {
        const r = removeBlockById(cur(), id);
        if (r.ok) apply(r.doc, { selectId: ref.current.selectedId === id ? null : undefined });
      },

      setPage: (patch: Partial<LetterDocument["page"]>) => apply(patchPage(cur(), patch), { coalesceKey: "page" }),
      setNumbering: (patch: Partial<LetterDocument["numbering"]>) =>
        apply(patchNumbering(cur(), patch), { coalesceKey: "numbering" }),
      setMeta: (patch: Partial<Pick<LetterDocument, "kind" | "audience" | "letterhead">>) =>
        apply(patchMeta(cur(), patch)),

      addPerson(label: string, opts?: Parameters<typeof addPersonRole>[2]): string {
        const r = addPersonRole(cur(), label, opts);
        apply(r.doc);
        return r.id;
      },
      updatePerson: (id: string, patch: Parameters<typeof patchPerson>[2]) =>
        apply(patchPerson(cur(), id, patch), { coalesceKey: `person:${id}` }),
      personUsage: (id: string) => personUsage(cur(), id),
      removePerson: (id: string): OpResult => toOp(removePersonFromDoc(cur(), id), (d) => apply(d)),

      addField(label: string, type?: Parameters<typeof addCustomField>[2], opts?: Parameters<typeof addCustomField>[3]): string {
        const r = addCustomField(cur(), label, type, opts);
        apply(r.doc);
        return r.id;
      },
      updateField: (id: string, patch: Parameters<typeof patchField>[2]) =>
        apply(patchField(cur(), id, patch), { coalesceKey: `field:${id}` }),
      fieldUsage: (id: string) => fieldUsage(cur(), id),
      removeField: (id: string): OpResult => toOp(removeFieldFromDoc(cur(), id), (d) => apply(d)),

      addGroup(label: string, opts?: Parameters<typeof addGroupDef>[2]): string {
        const r = addGroupDef(cur(), label, opts);
        apply(r.doc);
        return r.id;
      },
      updateGroup: (id: string, patch: Parameters<typeof patchGroup>[2]) =>
        apply(patchGroup(cur(), id, patch), { coalesceKey: `group:${id}` }),
      groupUsage: (id: string) => groupUsage(cur(), id),
      removeGroup: (id: string): OpResult => toOp(removeGroupFromDoc(cur(), id), (d) => apply(d)),

      replaceDocument: (doc: LetterDocument) => apply(doc, { selectId: null }),
    }),
    [apply, dispatch],
  );

  // Validasi & saran dihitung dari salinan tertunda agar mengetik tidak tersendat.
  const deferredDoc = useDeferredValue(state.doc);
  const { issues, hints } = useMemo(() => {
    const v = validateDocument(deferredDoc);
    if (!v.ok) {
      const issues: EditorIssue[] = v.issues.map((i) => ({
        path: i.path,
        message: i.message,
        blockId: blockIdFromPath(deferredDoc, i.path),
      }));
      return { issues, hints: [] as EditorApi["hints"] };
    }
    return { issues: [] as EditorIssue[], hints: lintDocument(v.doc) as EditorApi["hints"] };
  }, [deferredDoc]);

  return {
    doc: state.doc,
    selectedId: state.selectedId,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    dirty: isDirty(state),
    revision: state.revision,
    issues,
    hints,
    ...api,
  };
}
