/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, memo } from "react";
import {
  ContentBlock,
  BlockType,
  TableRow,
  ListItem,
  FontFamily,
} from "./types";
import { createDefaultTableRows } from "./tableBlockDefaults";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Switch } from "../ui/switch";
import {
  GripVertical,
  Trash2,
  Type,
  Heading1,
  Table,
  List,
  Minus,
  Space,
  Variable,
  Image as ImageIcon,
  Plus,
  ChevronUp,
  ChevronDown,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Underline,
} from "lucide-react";
import { cn } from "../ui/utils";
import { SmartVariableInput } from "./SmartVariableInput";
import { VariablePickerContent } from "./VariablePickerContent";

// Template Kalimat untuk Quick Insert
const SENTENCE_TEMPLATES = {
  Pembuka: [
    "Yang bertanda tangan di bawah ini {KEPALA_DESA_NAMA}, Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, dengan ini menerangkan bahwa:",
    "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, dengan ini menerangkan bahwa:",
    "Yang bertanda tangan di bawah ini, menerangkan dengan sebenarnya bahwa:",
    "Berdasarkan surat permohonan dari yang bersangkutan, dengan ini kami menerangkan bahwa:",
  ],
  "Isi/Body": [
    "Adalah benar warga Desa {NAMA_DESA} yang berdomisili di alamat tersebut di atas.",
    "Adalah benar-benar warga kami yang bertempat tinggal di wilayah Desa {NAMA_DESA}.",
    "Orang tersebut di atas adalah benar warga Desa {NAMA_DESA} dan memiliki kelakuan baik.",
    "Sepanjang yang kami ketahui, yang bersangkutan berkelakuan baik dan tidak pernah terlibat masalah hukum.",
    "Yang bersangkutan benar-benar memerlukan surat keterangan ini untuk keperluan {KEPERLUAN}.",
  ],
  Penutup: [
    "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
    "Demikian surat keterangan ini kami buat untuk {KEPERLUAN}.",
    "Demikian surat keterangan ini dibuat dengan sebenar-benarnya, atas perhatiannya kami ucapkan terima kasih.",
    "Demikian untuk menjadikan maklum dan atas perhatiannya diucapkan terima kasih.",
  ],
  Transisi: [
    "Selanjutnya yang bersangkutan bermaksud untuk {KEPERLUAN}.",
    "Adapun maksud dan tujuan pembuatan surat ini adalah untuk {KEPERLUAN}.",
    "Sehubungan dengan hal tersebut, maka kami membuat surat keterangan ini.",
  ],
};

interface ContentBlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  onInsertVariable: (blockId: string) => void;
}

function ContentBlockEditorComponent({
  blocks,
  onChange,
}: ContentBlockEditorProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(
    new Set(blocks.map((b) => b.id)),
  );
  const [focusedInput, setFocusedInput] = useState<{
    blockId: string;
    rowIndex?: number;
    fieldName?: "content" | "value" | "label";
  } | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [_, setIsMentionTriggered] = useState(false);
  const inputRefs = useRef<{
    [key: string]: HTMLInputElement | HTMLTextAreaElement;
  }>({});

  const handleInsertVariable = (variable: string) => {
    if (!focusedInput) return;

    const { blockId, rowIndex, fieldName = "content" } = focusedInput;
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    const inputKey =
      block.type === "table" && rowIndex !== undefined
        ? `${blockId}-${rowIndex}-${fieldName}`
        : `${blockId}-${fieldName}`;

    const inputElement = inputRefs.current[inputKey];

    let currentText = "";
    if (
      block.type === "table" &&
      rowIndex !== undefined &&
      Array.isArray(block.content)
    ) {
      const row = (block.content as TableRow[])[rowIndex];
      currentText = (fieldName === "label" ? row?.label : row?.value) || "";
    } else {
      currentText = (block.content as string) || "";
    }

    if (inputElement) {
      let cursorPos =
        inputElement.selectionStart !== null
          ? inputElement.selectionStart
          : currentText.length;

      let beforeCursor = currentText.substring(0, cursorPos);
      const afterCursor = currentText.substring(cursorPos);

      // Lebih teliti saat menghapus '@': cek jika karakter di kursor atau sebelumnya adalah '@'
      if (beforeCursor.endsWith("@")) {
        beforeCursor = beforeCursor.slice(0, -1);
        cursorPos -= 1;
      } else if (afterCursor.startsWith("@")) {
        // Jika kursor berada tepat sebelum '@'
        // case ini jarang tapi mungkin
      }

      const newValue = beforeCursor + `{${variable}}` + afterCursor;

      if (block.type === "table" && rowIndex !== undefined) {
        updateTableRow(blockId, rowIndex, { [fieldName]: newValue });
      } else {
        updateBlock(blockId, { [fieldName]: newValue });
      }

      // Close popover after inserting
      setOpenPopoverId(null);
      setIsMentionTriggered(false);

      // Set cursor position after variable
      setTimeout(() => {
        const newCursorPos = cursorPos + variable.length + 2;
        inputElement.focus();
        inputElement.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleTextChange = (
    blockId: string,
    value: string,
    fieldName: "content" | "value" | "label" = "content",
    rowIndex?: number,
  ) => {
    // Update state based on type
    if (rowIndex !== undefined) {
      updateTableRow(blockId, rowIndex, { [fieldName]: value });
    } else {
      updateBlock(blockId, { [fieldName]: value });
    }

    // Cek trigger '@'
    const lastChar = value.slice(-1);
    if (lastChar === "@") {
      const popoverId =
        rowIndex !== undefined
          ? `${blockId}-${rowIndex}`
          : `${blockId}-${fieldName}`;

      setOpenPopoverId(popoverId);
      setIsMentionTriggered(true);
    }
  };

  const blockIdCounter = useRef(0);

  const addBlock = (type: BlockType) => {
    blockIdCounter.current += 1;
    const newBlock: ContentBlock = {
      id: `block-${crypto.randomUUID()}-${blockIdCounter.current}`,
      type,
      content:
        type === "table"
          ? createDefaultTableRows()
          : type === "list"
            ? []
            : "",
      style: {
        align: "left",
        size: "medium",
        bold: false,
      },
    };

    onChange([...blocks, newBlock]);
    setExpandedBlocks(new Set([...expandedBlocks, newBlock.id]));
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    onChange(
      blocks.map((block) =>
        block.id === id ? { ...block, ...updates } : block,
      ),
    );
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((block) => block.id !== id));
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    const index = blocks.findIndex((b) => b.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [
      newBlocks[targetIndex],
      newBlocks[index],
    ];
    onChange(newBlocks);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedBlocks(newExpanded);
  };

  const addTableRow = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block && Array.isArray(block.content)) {
      const newRow: TableRow = { label: "", value: "" };
      updateBlock(blockId, {
        content: [...(block.content as TableRow[]), newRow],
      });
    }
  };

  const updateTableRow = (
    blockId: string,
    rowIndex: number,
    updates: Partial<TableRow>,
  ) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block && Array.isArray(block.content)) {
      const newContent = [...(block.content as TableRow[])];
      newContent[rowIndex] = { ...newContent[rowIndex], ...updates };
      updateBlock(blockId, { content: newContent });
    }
  };

  const removeTableRow = (blockId: string, rowIndex: number) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block && Array.isArray(block.content)) {
      const newContent = (block.content as TableRow[]).filter(
        (_, i) => i !== rowIndex,
      );
      updateBlock(blockId, { content: newContent });
    }
  };

  const addListItem = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block && Array.isArray(block.content)) {
      const newItem: ListItem = { text: "", level: 0 };
      updateBlock(blockId, {
        content: [...(block.content as ListItem[]), newItem],
      });
    }
  };

  const updateListItem = (
    blockId: string,
    itemIndex: number,
    updates: Partial<ListItem>,
  ) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block && Array.isArray(block.content)) {
      const newContent = [...(block.content as ListItem[])];
      newContent[itemIndex] = { ...newContent[itemIndex], ...updates };
      updateBlock(blockId, { content: newContent });
    }
  };

  const removeListItem = (blockId: string, itemIndex: number) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block && Array.isArray(block.content)) {
      const newContent = (block.content as ListItem[]).filter(
        (_, i) => i !== itemIndex,
      );
      updateBlock(blockId, { content: newContent });
    }
  };

  const getBlockIcon = (type: BlockType) => {
    switch (type) {
      case "heading":
        return <Heading1 className="h-4 w-4" />;
      case "text":
        return <Type className="h-4 w-4" />;
      case "table":
        return <Table className="h-4 w-4" />;
      case "list":
        return <List className="h-4 w-4" />;
      case "separator":
        return <Minus className="h-4 w-4" />;
      case "spacer":
        return <Space className="h-4 w-4" />;
      case "variable":
        return <Variable className="h-4 w-4" />;
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  const getBlockLabel = (type: BlockType) => {
    switch (type) {
      case "heading":
        return "Heading";
      case "text":
        return "Paragraf";
      case "table":
        return "Tabel";
      case "list":
        return "List";
      case "separator":
        return "Garis Pembatas";
      case "spacer":
        return "Jarak";
      case "variable":
        return "Variabel";
      case "image":
        return "Gambar";
      default:
        return "Block";
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Block Buttons */}
      <div className="space-y-4 p-6 bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Tambah Konten Baru
            </h4>
            <p className="text-xs text-muted-foreground">
              Pilih jenis block untuk ditambahkan ke dalam surat
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            {
              type: "heading",
              label: "Heading",
              icon: Heading1,
              desc: "Judul seksi",
              color: "bg-blue-500/10 text-blue-600",
            },
            {
              type: "text",
              label: "Paragraf",
              icon: Type,
              desc: "Teks standar",
              color: "bg-indigo-500/10 text-indigo-600",
            },
            {
              type: "table",
              label: "Tabel",
              icon: Table,
              desc: "Data kolom",
              color: "bg-emerald-500/10 text-emerald-600",
            },
            {
              type: "list",
              label: "List",
              icon: List,
              desc: "Daftar poin",
              color: "bg-orange-500/10 text-orange-600",
            },
            {
              type: "separator",
              label: "Garis",
              icon: Minus,
              desc: "Pemisah",
              color: "bg-slate-500/10 text-slate-600",
            },
            {
              type: "spacer",
              label: "Jarak",
              icon: Space,
              desc: "Ruang kosong",
              color: "bg-purple-500/10 text-purple-600",
            },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => addBlock(item.type as BlockType)}
              className="flex flex-col items-center justify-center p-3 rounded-lg border bg-background hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform",
                  item.color,
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold">{item.label}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {item.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Blocks List */}
      <div className="space-y-3">
        {blocks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Type className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>Belum ada content block</p>
            <p className="text-sm">
              Klik tombol di atas untuk menambahkan block
            </p>
          </div>
        )}

        {blocks.map((block, index) => {
          const isExpanded = expandedBlocks.has(block.id);

          return (
            <div
              key={block.id}
              className="border rounded-lg bg-background overflow-hidden"
            >
              {/* Block Header */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 border-b">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <div className="flex items-center gap-2 flex-1">
                  {getBlockIcon(block.type)}
                  <span className="font-medium text-sm">
                    {getBlockLabel(block.type)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveBlock(block.id, "up")}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveBlock(block.id, "down")}
                    disabled={index === blocks.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(block.id)}
                    className="h-8 w-8 p-0"
                  >
                    {isExpanded ? "−" : "+"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBlock(block.id)}
                    className="h-8 w-8 p-0 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Block Content */}
              {isExpanded && (
                <div className="p-4 space-y-3">
                  {/* Heading Block */}
                  {block.type === "heading" && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Teks Heading</Label>
                          <Popover
                            open={openPopoverId === `${block.id}-heading`}
                            onOpenChange={(open) =>
                              setOpenPopoverId(
                                open ? `${block.id}-heading` : null,
                              )
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-2"
                              >
                                <Variable className="h-4 w-4" />
                                Variabel
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-125 p-0" align="end">
                              <VariablePickerContent
                                onSelect={handleInsertVariable}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <SmartVariableInput
                          value={block.content as string}
                          onChange={(val) => handleTextChange(block.id, val)}
                          onFocus={() =>
                            setFocusedInput({
                              blockId: block.id,
                              fieldName: "content",
                            })
                          }
                          inputRef={(el) => {
                            if (el)
                              inputRefs.current[`${block.id}-content`] = el;
                          }}
                          placeholder="Masukkan judul..."
                        />
                      </div>

                      {/* Styling Controls */}
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Font Family */}
                          <div className="space-y-2">
                            <Label className="text-xs">Jenis Font</Label>
                            <Select
                              value={block.style?.font || "Inter"}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  style: {
                                    ...block.style,
                                    font: value as FontFamily,
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Inter">Inter</SelectItem>
                                <SelectItem value="Literata">
                                  Literata
                                </SelectItem>
                                <SelectItem value="Times New Roman">
                                  Times New Roman
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Font Size */}
                          <div className="space-y-2">
                            <Label className="text-xs">Ukuran</Label>
                            <Select
                              value={block.style?.size || "medium"}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  style: { ...block.style, size: value as any },
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Kecil</SelectItem>
                                <SelectItem value="medium">Sedang</SelectItem>
                                <SelectItem value="large">Besar</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          {/* Alignment Icons */}
                          <div className="space-y-2">
                            <Label className="text-xs">Alignment</Label>
                            <div className="flex gap-1 border rounded-md p-1 bg-background">
                              <Button
                                type="button"
                                variant={
                                  block.style?.align === "left"
                                    ? "default"
                                    : "ghost"
                                }
                                size="sm"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, align: "left" },
                                  })
                                }
                                className="h-8 w-8 p-0"
                              >
                                <AlignLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  block.style?.align === "center"
                                    ? "default"
                                    : "ghost"
                                }
                                size="sm"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, align: "center" },
                                  })
                                }
                                className="h-8 w-8 p-0"
                              >
                                <AlignCenter className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  block.style?.align === "right"
                                    ? "default"
                                    : "ghost"
                                }
                                size="sm"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, align: "right" },
                                  })
                                }
                                className="h-8 w-8 p-0"
                              >
                                <AlignRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Bold Switch */}
                          <div className="space-y-2">
                            <Label className="text-xs">Bold</Label>
                            <div className="flex items-center gap-2 h-8">
                              <Switch
                                checked={block.style?.bold || false}
                                onCheckedChange={(checked) =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, bold: checked },
                                  })
                                }
                              />
                              <Bold
                                className={`h-4 w-4 ${
                                  block.style?.bold
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                          </div>

                          {/* Italic Switch */}
                          <div className="space-y-2">
                            <Label className="text-xs">Italic</Label>
                            <div className="flex items-center gap-2 h-8">
                              <Switch
                                checked={block.style?.italic || false}
                                onCheckedChange={(checked) =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, italic: checked },
                                  })
                                }
                              />
                              <span
                                className={`font-serif italic text-sm ${
                                  block.style?.italic
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              >
                                I
                              </span>
                            </div>
                          </div>

                          {/* Underline Switch */}
                          <div className="space-y-2">
                            <Label className="text-xs">Underline</Label>
                            <div className="flex items-center gap-2 h-8">
                              <Switch
                                checked={block.style?.underline || false}
                                onCheckedChange={(checked) =>
                                  updateBlock(block.id, {
                                    style: {
                                      ...block.style,
                                      underline: checked,
                                    },
                                  })
                                }
                              />
                              <Underline
                                className={`h-4 w-4 ${
                                  block.style?.underline
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                          </div>
                          {/* Underline Switch */}
                          <div className="space-y-2">
                            <Label className="text-xs">Underline</Label>
                            <div className="flex items-center gap-2 h-8">
                              <Switch
                                checked={block.style?.underline || false}
                                onCheckedChange={(checked) =>
                                  updateBlock(block.id, {
                                    style: {
                                      ...block.style,
                                      underline: checked,
                                    },
                                  })
                                }
                              />
                              <Underline
                                className={`h-4 w-4 ${
                                  block.style?.underline
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Text Block */}
                  {block.type === "text" && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Konten Paragraf</Label>
                          <div className="flex gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  Template Kalimat
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-137.5 p-0"
                                align="end"
                                side="bottom"
                                sideOffset={8}
                              >
                                <div className="sticky top-0 z-10 p-3 border-b bg-background">
                                  <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Template Kalimat Surat Desa
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Klik kalimat untuk menambahkan ke paragraf
                                  </p>
                                </div>

                                <div className="max-h-100 overflow-y-auto">
                                  {Object.entries(SENTENCE_TEMPLATES).map(
                                    ([category, sentences]) => (
                                      <div
                                        key={category}
                                        className="p-4 border-b last:border-b-0"
                                      >
                                        <h5 className="font-semibold text-sm mb-3 text-primary">
                                          {category}
                                        </h5>
                                        <div className="space-y-2">
                                          {sentences.map((sentence, idx) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => {
                                                const currentContent =
                                                  block.content as string;
                                                const newContent =
                                                  currentContent
                                                    ? currentContent +
                                                      "\n\n" +
                                                      sentence
                                                    : sentence;
                                                updateBlock(block.id, {
                                                  content: newContent,
                                                });
                                              }}
                                              className="w-full text-left p-3 rounded-md border hover:border-primary hover:bg-primary/5 transition-colors text-sm leading-relaxed"
                                            >
                                              {sentence}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>

                            <Popover
                              open={openPopoverId === `${block.id}-text`}
                              onOpenChange={(open) =>
                                setOpenPopoverId(
                                  open ? `${block.id}-text` : null,
                                )
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                >
                                  <Variable className="h-4 w-4" />
                                  Insert Variabel
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-125 p-0" align="end">
                                <VariablePickerContent
                                  onSelect={handleInsertVariable}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <SmartVariableInput
                          textarea
                          value={block.content as string}
                          onChange={(val) => handleTextChange(block.id, val)}
                          onFocus={() =>
                            setFocusedInput({
                              blockId: block.id,
                              fieldName: "content",
                            })
                          }
                          inputRef={(el) => {
                            if (el)
                              inputRefs.current[`${block.id}-content`] = el;
                          }}
                          placeholder="Masukkan teks... Gunakan {VARIABEL} untuk data dinamis"
                          className="min-h-30"
                        />
                      </div>

                      {/* Styling Controls */}
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Font Family */}
                          <div className="space-y-2">
                            <Label className="text-xs">Jenis Font</Label>
                            <Select
                              value={block.style?.font || "Inter"}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  style: {
                                    ...block.style,
                                    font: value as FontFamily,
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Inter">Inter</SelectItem>
                                <SelectItem value="Literata">
                                  Literata
                                </SelectItem>
                                <SelectItem value="Times New Roman">
                                  Times New Roman
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Font Size */}
                          <div className="space-y-2">
                            <Label className="text-xs">Ukuran</Label>
                            <Select
                              value={block.style?.size || "medium"}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  style: { ...block.style, size: value as any },
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Kecil</SelectItem>
                                <SelectItem value="medium">Sedang</SelectItem>
                                <SelectItem value="large">Besar</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          {/* Alignment Icons */}
                          <div className="space-y-2 flex-1">
                            <Label className="text-xs">Alignment</Label>
                            <div className="flex gap-1 border rounded-md p-1 bg-background">
                              <Button
                                type="button"
                                variant={
                                  block.style?.align === "left"
                                    ? "default"
                                    : "ghost"
                                }
                                size="sm"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, align: "left" },
                                  })
                                }
                                className="h-8 w-8 p-0"
                              >
                                <AlignLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  block.style?.align === "center"
                                    ? "default"
                                    : "ghost"
                                }
                                size="sm"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, align: "center" },
                                  })
                                }
                                className="h-8 w-8 p-0"
                              >
                                <AlignCenter className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  block.style?.align === "right"
                                    ? "default"
                                    : "ghost"
                                }
                                size="sm"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, align: "right" },
                                  })
                                }
                                className="h-8 w-8 p-0"
                              >
                                <AlignRight className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  block.style?.align === "justify"
                                    ? "default"
                                    : "ghost"
                                }
                                size="sm"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, align: "justify" },
                                  })
                                }
                                className="h-8 w-8 p-0"
                              >
                                <AlignJustify className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Bold Switch */}
                          <div className="space-y-2">
                            <Label className="text-xs">Bold</Label>
                            <div className="flex items-center gap-2 h-8">
                              <Switch
                                checked={block.style?.bold || false}
                                onCheckedChange={(checked) =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, bold: checked },
                                  })
                                }
                              />
                              <Bold
                                className={`h-4 w-4 ${
                                  block.style?.bold
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                          </div>

                          {/* Underline Switch */}
                          <div className="space-y-2">
                            <Label className="text-xs">Underline</Label>
                            <div className="flex items-center gap-2 h-8">
                              <Switch
                                checked={block.style?.underline || false}
                                onCheckedChange={(checked) =>
                                  updateBlock(block.id, {
                                    style: {
                                      ...block.style,
                                      underline: checked,
                                    },
                                  })
                                }
                              />
                              <Underline
                                className={`h-4 w-4 ${
                                  block.style?.underline
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Table Block */}
                  {block.type === "table" && (
                    <div className="space-y-4">
                      {/* Styling Controls */}
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Font Family */}
                          <div className="space-y-2">
                            <Label className="text-xs">Jenis Font</Label>
                            <Select
                              value={block.style?.font || "Inter"}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  style: {
                                    ...block.style,
                                    font: value as FontFamily,
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Inter">Inter</SelectItem>
                                <SelectItem value="Literata">
                                  Literata
                                </SelectItem>
                                <SelectItem value="Times New Roman">
                                  Times New Roman
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Font Size */}
                          <div className="space-y-2">
                            <Label className="text-xs">Ukuran</Label>
                            <Select
                              value={block.style?.size || "medium"}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  style: { ...block.style, size: value as any },
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Kecil</SelectItem>
                                <SelectItem value="medium">Sedang</SelectItem>
                                <SelectItem value="large">Besar</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          {/* Alignment Icons */}
                          <div className="space-y-2">
                            <Label className="text-xs">Alignment Label</Label>
                            <div className="flex gap-1 border rounded-md p-1 bg-background">
                              <Button
                                type="button"
                                variant={
                                  block.style?.align === "left"
                                    ? "default"
                                    : "ghost"
                                }
                                size="sm"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, align: "left" },
                                  })
                                }
                                className="h-8 w-8 p-0"
                              >
                                <AlignLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  block.style?.align === "center"
                                    ? "default"
                                    : "ghost"
                                }
                                size="sm"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, align: "center" },
                                  })
                                }
                                className="h-8 w-8 p-0"
                              >
                                <AlignCenter className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Border Switch */}
                          <div className="space-y-2">
                            <Label className="text-xs">Border</Label>
                            <div className="flex items-center gap-2 h-8">
                              <Switch
                                checked={block.style?.border || false}
                                onCheckedChange={(checked) =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, border: checked },
                                  })
                                }
                              />
                              <Table
                                className={`h-4 w-4 ${
                                  block.style?.border
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                          </div>

                          {/* Bold Switch */}
                          <div className="space-y-2">
                            <Label className="text-xs">Bold Label</Label>
                            <div className="flex items-center gap-2 h-8">
                              <Switch
                                checked={block.style?.bold || false}
                                onCheckedChange={(checked) =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, bold: checked },
                                  })
                                }
                              />
                              <Bold
                                className={`h-4 w-4 ${
                                  block.style?.bold
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-muted/20 p-2 rounded-md border border-dashed">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          Konfigurasi Baris Tabel
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => addTableRow(block.id)}
                          className="gap-2 h-8"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Tambah Baris
                        </Button>
                      </div>

                      <div className="space-y-2 border rounded-lg p-2 bg-muted/5">
                        {Array.isArray(block.content) &&
                        (block.content as TableRow[]).length > 0 ? (
                          (block.content as TableRow[]).map((row, rowIndex) => {
                            const popoverId = `${block.id}-${rowIndex}`;

                            return (
                              <div
                                key={rowIndex}
                                className="group flex gap-3 items-center p-2 rounded-md hover:bg-background hover:shadow-sm border border-transparent hover:border-border transition-all"
                              >
                                <div className="flex-[0.4] min-w-0">
                                  <Label className="text-[10px] text-muted-foreground mb-1 block px-1">
                                    Label
                                  </Label>
                                  <SmartVariableInput
                                    value={row.label}
                                    onChange={(val) =>
                                      handleTextChange(
                                        block.id,
                                        val,
                                        "label",
                                        rowIndex,
                                      )
                                    }
                                    onFocus={() =>
                                      setFocusedInput({
                                        blockId: block.id,
                                        rowIndex,
                                        fieldName: "label",
                                      })
                                    }
                                    inputRef={(el) => {
                                      if (el)
                                        inputRefs.current[
                                          `${block.id}-${rowIndex}-label`
                                        ] = el;
                                    }}
                                    placeholder="Nama, NIK, dll"
                                    className="min-h-9"
                                  />
                                </div>

                                <div className="flex-[0.6] min-w-0 flex gap-2 items-end">
                                  <div className="flex-1">
                                    <Label className="text-[10px] text-muted-foreground mb-1 block px-1">
                                      Value / Variabel
                                    </Label>
                                    <SmartVariableInput
                                      value={row.value}
                                      onChange={(val) =>
                                        handleTextChange(
                                          block.id,
                                          val,
                                          "value",
                                          rowIndex,
                                        )
                                      }
                                      onFocus={() =>
                                        setFocusedInput({
                                          blockId: block.id,
                                          rowIndex,
                                          fieldName: "value",
                                        })
                                      }
                                      inputRef={(el) => {
                                        if (el)
                                          inputRefs.current[
                                            `${block.id}-${rowIndex}-value`
                                          ] = el;
                                      }}
                                      placeholder="Isi teks atau @variabel"
                                      className="min-h-9"
                                    />
                                  </div>

                                  <div className="flex gap-1 mb-px">
                                    <Popover
                                      open={openPopoverId === popoverId}
                                      onOpenChange={(open) => {
                                        setOpenPopoverId(
                                          open ? popoverId : null,
                                        );
                                        if (open) {
                                          setFocusedInput({
                                            blockId: block.id,
                                            rowIndex,
                                            fieldName: "value",
                                          });
                                        }
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-9 w-9 shrink-0 border-dashed hover:border-primary hover:text-primary transition-colors"
                                        >
                                          <Variable className="h-4 w-4" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-125 p-0"
                                        align="end"
                                      >
                                        <VariablePickerContent
                                          onSelect={handleInsertVariable}
                                        />
                                      </PopoverContent>
                                    </Popover>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        removeTableRow(block.id, rowIndex)
                                      }
                                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-md bg-background">
                            Belum ada baris tabel. Klik &quot;Tambah Baris&quot;
                            untuk memulai.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* List Block */}
                  {block.type === "list" && (
                    <div className="space-y-4">
                      {/* Styling Controls */}
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Font Family */}
                          <div className="space-y-2">
                            <Label className="text-xs">Jenis Font</Label>
                            <Select
                              value={block.style?.font || "Inter"}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  style: {
                                    ...block.style,
                                    font: value as FontFamily,
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Inter">Inter</SelectItem>
                                <SelectItem value="Literata">
                                  Literata
                                </SelectItem>
                                <SelectItem value="Times New Roman">
                                  Times New Roman
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Font Size */}
                          <div className="space-y-2">
                            <Label className="text-xs">Ukuran</Label>
                            <Select
                              value={block.style?.size || "medium"}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  style: { ...block.style, size: value as any },
                                })
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Kecil</SelectItem>
                                <SelectItem value="medium">Sedang</SelectItem>
                                <SelectItem value="large">Besar</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Bold Switch */}
                          <div className="space-y-2">
                            <Label className="text-xs">Bold</Label>
                            <div className="flex items-center gap-2 h-8">
                              <Switch
                                checked={block.style?.bold || false}
                                onCheckedChange={(checked) =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, bold: checked },
                                  })
                                }
                              />
                              <Bold
                                className={`h-4 w-4 ${
                                  block.style?.bold
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                          </div>

                          {/* Italic Switch */}
                          <div className="space-y-2">
                            <Label className="text-xs">Italic</Label>
                            <div className="flex items-center gap-2 h-8">
                              <Switch
                                checked={block.style?.italic || false}
                                onCheckedChange={(checked) =>
                                  updateBlock(block.id, {
                                    style: { ...block.style, italic: checked },
                                  })
                                }
                              />
                              <span
                                className={`font-serif italic text-sm ${
                                  block.style?.italic
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              >
                                I
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Item List</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addListItem(block.id)}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Tambah Item
                        </Button>
                      </div>

                      {Array.isArray(block.content) &&
                        (block.content as ListItem[]).map((item, itemIndex) => (
                          <div
                            key={itemIndex}
                            className="flex gap-2 items-center"
                          >
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateListItem(block.id, itemIndex, {
                                    level: Math.max(0, (item.level || 0) - 1),
                                  })
                                }
                                disabled={(item.level || 0) === 0}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronUp className="h-4 w-4 rotate-270" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateListItem(block.id, itemIndex, {
                                    level: Math.min(3, (item.level || 0) + 1),
                                  })
                                }
                                disabled={(item.level || 0) === 3}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronDown className="h-4 w-4 rotate-270" />
                              </Button>
                            </div>
                            <div
                              className="flex-1"
                              style={{
                                marginLeft: `${(item.level || 0) * 20}px`,
                              }}
                            >
                              <Input
                                value={item.text}
                                onChange={(e) =>
                                  updateListItem(block.id, itemIndex, {
                                    text: e.target.value,
                                  })
                                }
                                placeholder="Teks item..."
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                removeListItem(block.id, itemIndex)
                              }
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Separator Block */}
                  {block.type === "separator" && (
                    <div className="py-4 border-y border-dashed text-center text-xs text-muted-foreground bg-muted/20">
                      Garis Pembatas Horizontal
                    </div>
                  )}

                  {/* Spacer Block */}
                  {block.type === "spacer" && (
                    <div className="space-y-2">
                      <Label>Tinggi Jarak (px)</Label>
                      <Input
                        type="number"
                        value={block.content as string}
                        onChange={(e) =>
                          updateBlock(block.id, { content: e.target.value })
                        }
                        placeholder="Misal: 20"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ContentBlockEditor = memo(ContentBlockEditorComponent);
