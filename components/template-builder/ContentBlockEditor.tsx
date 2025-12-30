/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import {
  ContentBlock,
  BlockType,
  TableRow,
  ListItem,
  AVAILABLE_VARIABLES,
  FontFamily,
} from "./types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
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

export function ContentBlockEditor({
  blocks,
  onChange,
  onInsertVariable,
}: ContentBlockEditorProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(
    new Set(blocks.map((b) => b.id))
  );
  const [focusedInput, setFocusedInput] = useState<{
    blockId: string;
    rowIndex: number;
  } | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement }>({});

  const addBlock = (type: BlockType) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type,
      content: type === "table" ? [] : type === "list" ? [] : "",
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
        block.id === id ? { ...block, ...updates } : block
      )
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
    updates: Partial<TableRow>
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
        (_, i) => i !== rowIndex
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
    updates: Partial<ListItem>
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
        (_, i) => i !== itemIndex
      );
      updateBlock(blockId, { content: newContent });
    }
  };

  const handleInsertVariable = (variable: string) => {
    if (!focusedInput) return;

    const { blockId, rowIndex } = focusedInput;
    const block = blocks.find((b) => b.id === blockId);

    if (block && block.type === "table" && Array.isArray(block.content)) {
      const row = (block.content as TableRow[])[rowIndex];
      const inputKey = `${blockId}-${rowIndex}-value`;
      const inputElement = inputRefs.current[inputKey];

      if (inputElement && row) {
        const cursorPos = inputElement.selectionStart || row.value.length;
        const beforeCursor = row.value.substring(0, cursorPos);
        const afterCursor = row.value.substring(cursorPos);
        const newValue = beforeCursor + `{${variable}}` + afterCursor;

        updateTableRow(blockId, rowIndex, { value: newValue });

        // Close popover after inserting
        setOpenPopoverId(null);

        // Set cursor position after variable
        setTimeout(() => {
          const newCursorPos = cursorPos + variable.length + 2;
          inputElement.setSelectionRange(newCursorPos, newCursorPos);
          inputElement.focus();
        }, 0);
      }
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
      <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
        <span className="text-sm font-medium text-muted-foreground w-full mb-1">
          Tambah Block:
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBlock("heading")}
          className="gap-2"
        >
          <Heading1 className="h-4 w-4" />
          Heading
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBlock("text")}
          className="gap-2"
        >
          <Type className="h-4 w-4" />
          Paragraf
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBlock("table")}
          className="gap-2"
        >
          <Table className="h-4 w-4" />
          Tabel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBlock("list")}
          className="gap-2"
        >
          <List className="h-4 w-4" />
          List
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBlock("separator")}
          className="gap-2"
        >
          <Minus className="h-4 w-4" />
          Garis
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBlock("spacer")}
          className="gap-2"
        >
          <Space className="h-4 w-4" />
          Jarak
        </Button>
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
                        <Label>Teks Heading</Label>
                        <Input
                          value={block.content as string}
                          onChange={(e) =>
                            updateBlock(block.id, { content: e.target.value })
                          }
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
                                className="w-[550px] p-0"
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

                                <div className="max-h-[400px] overflow-y-auto">
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
                                    )
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onInsertVariable(block.id)}
                              className="gap-2"
                            >
                              <Variable className="h-4 w-4" />
                              Insert Variabel
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={block.content as string}
                          onChange={(e) =>
                            updateBlock(block.id, { content: e.target.value })
                          }
                          placeholder="Masukkan teks... Gunakan {VARIABEL} untuk data dinamis"
                          rows={4}
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
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Baris Tabel</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTableRow(block.id)}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Tambah Baris
                        </Button>
                      </div>

                      {Array.isArray(block.content) &&
                        (block.content as TableRow[]).map((row, rowIndex) => {
                          const popoverId = `${block.id}-${rowIndex}`;
                          const isPopoverOpen = openPopoverId === popoverId;

                          return (
                            <div
                              key={rowIndex}
                              className="flex gap-2 items-start"
                            >
                              <Input
                                value={row.label}
                                onChange={(e) =>
                                  updateTableRow(block.id, rowIndex, {
                                    label: e.target.value,
                                  })
                                }
                                placeholder="Label (Nama, NIK, dll)"
                                className="flex-1"
                              />
                              <div className="flex-1 flex gap-2">
                                <Input
                                  value={row.value}
                                  onChange={(e) =>
                                    updateTableRow(block.id, rowIndex, {
                                      value: e.target.value,
                                    })
                                  }
                                  placeholder="Value (gunakan {VARIABEL})"
                                  className="flex-1"
                                  ref={(el) => {
                                    if (el) {
                                      inputRefs.current[
                                        `${block.id}-${rowIndex}-value`
                                      ] = el;
                                    }
                                  }}
                                  onFocus={() =>
                                    setFocusedInput({
                                      blockId: block.id,
                                      rowIndex,
                                    })
                                  }
                                />
                                <Popover
                                  open={isPopoverOpen}
                                  onOpenChange={(open) => {
                                    if (open) {
                                      setFocusedInput({
                                        blockId: block.id,
                                        rowIndex,
                                      });
                                      setOpenPopoverId(popoverId);
                                    } else {
                                      setOpenPopoverId(null);
                                    }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-10 px-3 gap-2"
                                    >
                                      <Variable className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-[500px] p-0"
                                    align="end"
                                  >
                                    <div className="max-h-[400px] overflow-y-auto">
                                      <div className="p-3 border-b bg-muted/30">
                                        <h4 className="font-semibold text-sm">
                                          Pilih Variabel
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                          Klik variabel untuk insert ke input
                                          value
                                        </p>
                                      </div>
                                      {Object.entries(
                                        AVAILABLE_VARIABLES.reduce((acc, v) => {
                                          if (!acc[v.category])
                                            acc[v.category] = [];
                                          acc[v.category].push(v);
                                          return acc;
                                        }, {} as Record<string, typeof AVAILABLE_VARIABLES>)
                                      ).map(([category, vars]) => (
                                        <div
                                          key={category}
                                          className="p-3 border-b last:border-b-0"
                                        >
                                          <h5 className="font-medium text-xs text-muted-foreground mb-2">
                                            {category}
                                          </h5>
                                          <div className="flex flex-wrap gap-1.5">
                                            {vars.map((v) => (
                                              <Button
                                                key={v.key}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  handleInsertVariable(v.key)
                                                }
                                                className="h-7 text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground"
                                              >
                                                <Variable className="h-3 w-3" />
                                                {v.label}
                                              </Button>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeTableRow(block.id, rowIndex)
                                }
                                className="h-10 w-10 p-0 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}

                      {Array.isArray(block.content) &&
                        block.content.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Belum ada baris. Klik &quot;Tambah Baris&quot; untuk
                            mulai.
                          </p>
                        )}

                      {/* Styling Controls for Table */}
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
                        </div>

                        {/* Border Switch */}
                        <div className="flex items-center justify-between p-2 bg-background rounded border">
                          <div className="flex items-center gap-2">
                            <Table className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label className="text-xs font-medium">
                                Border Tabel
                              </Label>
                              <p className="text-[10px] text-muted-foreground">
                                Tampilkan garis pembatas
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={block.style?.border !== false}
                            onCheckedChange={(checked) =>
                              updateBlock(block.id, {
                                style: { ...block.style, border: checked },
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* List Block */}
                  {block.type === "list" && (
                    <div className="space-y-3">
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
                            <Input
                              value={item.text}
                              onChange={(e) =>
                                updateListItem(block.id, itemIndex, {
                                  text: e.target.value,
                                })
                              }
                              placeholder="Teks item..."
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeListItem(block.id, itemIndex)
                              }
                              className="h-10 w-10 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                      {Array.isArray(block.content) &&
                        block.content.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Belum ada item. Klik &quot;Tambah Item&quot; untuk
                            mulai.
                          </p>
                        )}
                    </div>
                  )}

                  {/* Separator Block */}
                  {block.type === "separator" && (
                    <div className="space-y-2">
                      <Label>Style Garis</Label>
                      <Select
                        value={block.style?.size || "medium"}
                        onValueChange={(value) =>
                          updateBlock(block.id, {
                            style: { ...block.style, size: value as any },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Tipis</SelectItem>
                          <SelectItem value="medium">Sedang</SelectItem>
                          <SelectItem value="large">Tebal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Spacer Block */}
                  {block.type === "spacer" && (
                    <div className="space-y-2">
                      <Label>Ukuran Jarak</Label>
                      <Select
                        value={block.style?.size || "medium"}
                        onValueChange={(value) =>
                          updateBlock(block.id, {
                            style: { ...block.style, size: value as any },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Kecil (1 baris)</SelectItem>
                          <SelectItem value="medium">
                            Sedang (2 baris)
                          </SelectItem>
                          <SelectItem value="large">Besar (3 baris)</SelectItem>
                        </SelectContent>
                      </Select>
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
