import {
  BookOpen, Columns2, FilePlus, FileText, Gavel, GitBranch, Heading, Image as ImageIcon, List, ListChecks,
  ListOrdered, Mail, Minus, MoveVertical, PenLine, QrCode, Scale, Shapes, Signature, Stamp, Table, Type,
  UserRound, Users, type LucideIcon,
} from "lucide-react";

/** Nama ikon pada `BLOCK_PRESETS` → komponen lucide. Nama tak dikenal memakai ikon cadangan. */
const ICONS: Record<string, LucideIcon> = {
  Type, Heading, FileText, Mail, List, Table, ListChecks, Scale, BookOpen, Gavel, ListOrdered, UserRound, Users,
  GitBranch, PenLine, Signature, Stamp, Columns2, Minus, MoveVertical, FilePlus, Image: ImageIcon, QrCode,
};

const FALLBACK: LucideIcon = Shapes;

/** Ikon dekoratif untuk sebuah bagian; selalu disembunyikan dari pembaca layar. */
export function PresetIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? FALLBACK;
  return <Icon className={className} aria-hidden />;
}
