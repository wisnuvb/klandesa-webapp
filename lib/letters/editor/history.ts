/**
 * State editor murni (tanpa React): dokumen aktif, seleksi, dan riwayat undo/redo.
 * Dipisahkan dari hook supaya bisa diuji dengan jam palsu.
 */
import type { LetterDocument } from "../document/schema";
import { findBlock } from "./ops";

export const HISTORY_LIMIT = 100;
/** Perubahan beruntun pada hal yang sama dalam jendela ini menjadi satu langkah undo. */
export const COALESCE_MS = 1000;

export type EditorState = {
  doc: LetterDocument;
  selectedId: string | null;
  past: LetterDocument[];
  future: LetterDocument[];
  /** Naik tiap dokumen berubah (termasuk undo/redo), bukan tiap seleksi. Dipakai autosave. */
  revision: number;
  /** Dokumen pada `markSaved()` terakhir; `dirty` = dokumen aktif berbeda dari ini. */
  savedDoc: LetterDocument;
  lastEdit: { key: string; at: number } | null;
};

export type EditorAction =
  | { type: "select"; id: string | null }
  | {
      type: "apply";
      next: LetterDocument;
      now: number;
      /** Perubahan dengan kunci sama dalam `COALESCE_MS` digabung menjadi satu langkah undo. */
      coalesceKey?: string;
      /** Seleksi sesudah perubahan; `undefined` = pertahankan (dibatalkan bila bloknya hilang). */
      selectId?: string | null;
    }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "markSaved" };

export function createEditorState(doc: LetterDocument): EditorState {
  return { doc, selectedId: null, past: [], future: [], revision: 0, savedDoc: doc, lastEdit: null };
}

export const isDirty = (s: EditorState): boolean => s.doc !== s.savedDoc;

/** Sama secara struktur (dokumen berupa JSON murni). */
export function sameDoc(a: LetterDocument, b: LetterDocument): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

const stillThere = (doc: LetterDocument, id: string | null): string | null => (id && findBlock(doc, id) ? id : null);

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "select": {
      const id = stillThere(state.doc, action.id);
      return id === state.selectedId ? state : { ...state, selectedId: id };
    }

    case "apply": {
      if (sameDoc(state.doc, action.next)) {
        // Tidak ada perubahan isi: tidak menambah riwayat; seleksi tetap boleh berpindah.
        if (action.selectId === undefined) return state;
        const id = stillThere(state.doc, action.selectId);
        return id === state.selectedId ? state : { ...state, selectedId: id };
      }
      const key = action.coalesceKey;
      const merge =
        key !== undefined &&
        state.lastEdit !== null &&
        state.lastEdit.key === key &&
        action.now - state.lastEdit.at <= COALESCE_MS &&
        state.past.length > 0;
      const past = merge ? state.past : [...state.past, state.doc].slice(-HISTORY_LIMIT);
      const selected = action.selectId === undefined ? state.selectedId : action.selectId;
      return {
        ...state,
        doc: action.next,
        past,
        future: [],
        revision: state.revision + 1,
        selectedId: stillThere(action.next, selected),
        lastEdit: key !== undefined ? { key, at: action.now } : null,
      };
    }

    case "undo": {
      if (state.past.length === 0) return state;
      const doc = state.past[state.past.length - 1];
      return {
        ...state,
        doc,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future].slice(0, HISTORY_LIMIT),
        revision: state.revision + 1,
        selectedId: stillThere(doc, state.selectedId),
        lastEdit: null,
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;
      const [doc, ...future] = state.future;
      return {
        ...state,
        doc,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future,
        revision: state.revision + 1,
        selectedId: stillThere(doc, state.selectedId),
        lastEdit: null,
      };
    }

    case "markSaved":
      return state.savedDoc === state.doc ? state : { ...state, savedDoc: state.doc };
  }
}
