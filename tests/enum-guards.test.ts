import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isKind } from "../lib/kdmp/catalog";
import { isProvider, isDangerSign } from "../lib/kia/catalog";
import { isSource, isMethod } from "../lib/blt/catalog";
import { isPriority, isTask } from "../lib/pktd/catalog";
import { isEntryType, isFundSource } from "../lib/apbdes/catalog";
import { isFocusKey, isPublicationChannel } from "../lib/dana-desa/rules";

/** Penjaga enum tidak boleh meloloskan kunci prototipe ("constructor", "__proto__", ...): nilainya akan tersimpan dan merusak label. */
describe("penjaga enum menolak kunci prototipe", () => {
  const guards: [string, (v: unknown) => boolean][] = [
    ["kdmp.isKind", isKind], ["kia.isProvider", isProvider], ["kia.isDangerSign", isDangerSign], ["blt.isSource", isSource], ["blt.isMethod", isMethod],
    ["pktd.isPriority", isPriority], ["pktd.isTask", isTask], ["apbdes.isEntryType", isEntryType], ["apbdes.isFundSource", isFundSource],
    ["danaDesa.isFocusKey", isFocusKey], ["danaDesa.isPublicationChannel", isPublicationChannel],
  ];
  for (const [name, fn] of guards) {
    it(name, () => {
      for (const bad of ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", 1, null, undefined, {}]) assert.equal(fn(bad), false, `${name}(${String(bad)})`);
    });
  }
});
