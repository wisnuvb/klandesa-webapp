import { BUILTIN_PRESETS } from "@/lib/website-engine/presets";
import { parseTemplateStructureManifest } from "@/lib/website-engine/manifest";

export type PresetOption = { key: string; name: string };

/** Preset per-template mendahului builtin bila key sama. */
export function listPresetOptions(templateStructure: unknown): PresetOption[] {
  const manifest = parseTemplateStructureManifest(templateStructure);
  const fromTemplate = manifest.templatePresets.map((p) => ({
    key: p.key,
    name: p.name,
  }));
  const keys = new Set(fromTemplate.map((p) => p.key));
  const fromBuiltin = BUILTIN_PRESETS.filter((p) => !keys.has(p.key)).map((p) => ({
    key: p.key,
    name: p.name,
  }));
  return [...fromTemplate, ...fromBuiltin];
}
