import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  Eye, 
  Save, 
  FileText, 
  Settings, 
  AlignLeft, 
  AlignJustify,
  Variable,
  X,
  BookTemplate,
  Hash
} from 'lucide-react';
import { HeaderCustomizer } from './HeaderCustomizer';
import { FooterBuilder } from './FooterBuilder';
import { LetterNumberBuilder } from './LetterNumberBuilder';
import { ContentBlockEditor } from './ContentBlockEditor';
import { VariablePicker } from './VariablePicker';
import { TemplatePreview } from './TemplatePreview';
import { TemplateLibraryDialog } from './TemplateLibraryDialog';
import { 
  TemplateData, 
  DEFAULT_HEADER_CONFIG, 
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_LETTER_NUMBER_CONFIG,
  AVAILABLE_VARIABLES 
} from './types';

interface TemplateBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: TemplateData) => void;
  desaSettings: any;
  editTemplate?: TemplateData | null;
}

export function TemplateBuilderDialog({ 
  open, 
  onOpenChange, 
  onSave,
  desaSettings,
  editTemplate 
}: TemplateBuilderDialogProps) {
  const [activeTab, setActiveTab] = useState('info');
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  
  const [templateData, setTemplateData] = useState<TemplateData>(
    editTemplate || {
      name: '',
      description: '',
      category: 'Keterangan',
      is_multi_page: false,
      header: DEFAULT_HEADER_CONFIG,
      letterNumber: DEFAULT_LETTER_NUMBER_CONFIG,
      blocks: [],
      footer: DEFAULT_FOOTER_CONFIG,
      variables: [],
      is_active: true,
    }
  );
  
  const updateTemplateData = (updates: Partial<TemplateData>) => {
    setTemplateData(prev => ({ ...prev, ...updates }));
  };
  
  const extractVariablesFromBlocks = () => {
    const variableSet = new Set<string>();
    
    templateData.blocks.forEach(block => {
      const content = typeof block.content === 'string' 
        ? block.content 
        : JSON.stringify(block.content);
      
      const matches = content.match(/{([A-Z_]+)}/g);
      if (matches) {
        matches.forEach(match => {
          const varName = match.replace(/[{}]/g, '');
          variableSet.add(varName);
        });
      }
    });
    
    return Array.from(variableSet);
  };
  
  const handleInsertVariable = (blockId: string) => {
    setCurrentBlockId(blockId);
    setShowVariablePicker(true);
  };
  
  const handleVariableSelect = (variable: string) => {
    if (currentBlockId) {
      const block = templateData.blocks.find(b => b.id === currentBlockId);
      if (block && typeof block.content === 'string') {
        const updatedBlocks = templateData.blocks.map(b => 
          b.id === currentBlockId 
            ? { ...b, content: `${b.content}{${variable}}` }
            : b
        );
        updateTemplateData({ blocks: updatedBlocks });
      }
    }
    setShowVariablePicker(false);
    setCurrentBlockId(null);
  };
  
  const handleSave = () => {
    const extractedVariables = extractVariablesFromBlocks();
    const finalTemplate = {
      ...templateData,
      variables: extractedVariables,
    };
    
    onSave(finalTemplate);
    onOpenChange(false);
    
    // Reset form
    setTemplateData({
      name: '',
      description: '',
      category: 'Keterangan',
      is_multi_page: false,
      header: DEFAULT_HEADER_CONFIG,
      letterNumber: DEFAULT_LETTER_NUMBER_CONFIG,
      blocks: [],
      footer: DEFAULT_FOOTER_CONFIG,
      variables: [],
      is_active: true,
    });
    setActiveTab('info');
  };
  
  const handleLoadTemplate = (template: TemplateData) => {
    setTemplateData(template);
    setActiveTab('info');
  };
  
  const usedVariables = extractVariablesFromBlocks();
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[96vw] w-full h-[92vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {editTemplate ? 'Edit Template Surat' : 'Buat Template Surat Baru'}
                </DialogTitle>
                <DialogDescription>
                  Buat template surat dengan sistem block editor yang fleksibel
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowLibrary(true)}
                className="gap-2"
              >
                <BookTemplate className="h-4 w-4" />
                Pilih dari Template
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Main Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b px-6 flex-shrink-0">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="info" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Info
                    </TabsTrigger>
                    <TabsTrigger value="header" className="gap-2">
                      <AlignLeft className="h-4 w-4" />
                      Header
                    </TabsTrigger>
                    <TabsTrigger value="letter" className="gap-2">
                      <Hash className="h-4 w-4" />
                      Nomor Surat
                    </TabsTrigger>
                    <TabsTrigger value="content" className="gap-2">
                      <AlignJustify className="h-4 w-4" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="footer" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Footer
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="flex-1 overflow-y-auto min-h-0">
                  {/* Info Tab */}
                  <TabsContent value="info" className="p-6 space-y-4 mt-0">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nama Template *</Label>
                        <Input
                          value={templateData.name}
                          onChange={(e) => updateTemplateData({ name: e.target.value })}
                          placeholder="Contoh: Surat Keterangan Domisili"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Deskripsi</Label>
                        <Textarea
                          value={templateData.description}
                          onChange={(e) => updateTemplateData({ description: e.target.value })}
                          placeholder="Deskripsi singkat tentang template ini..."
                          rows={3}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Kategori</Label>
                        <Select
                          value={templateData.category}
                          onValueChange={(value) => updateTemplateData({ category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Keterangan">Surat Keterangan</SelectItem>
                            <SelectItem value="Pengantar">Surat Pengantar</SelectItem>
                            <SelectItem value="Keterangan Usaha">Keterangan Usaha</SelectItem>
                            <SelectItem value="Domisili">Domisili</SelectItem>
                            <SelectItem value="Kuasa">Surat Kuasa</SelectItem>
                            <SelectItem value="Izin">Surat Izin</SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={templateData.is_active}
                          onChange={(e) => updateTemplateData({ is_active: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="is_active" className="cursor-pointer">
                          Template Aktif (dapat digunakan)
                        </Label>
                      </div>
                      
                      {/* Variables Preview */}
                      {usedVariables.length > 0 && (
                        <div className="space-y-2">
                          <Label>Variabel yang Terdeteksi ({usedVariables.length})</Label>
                          <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border">
                            {usedVariables.map(variable => (
                              <Badge key={variable} variant="secondary">
                                {variable}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Variabel ini akan otomatis diisi saat membuat surat
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Header Tab */}
                  <TabsContent value="header" className="mt-0">
                    <HeaderCustomizer
                      config={templateData.header}
                      onChange={(header) => updateTemplateData({ header })}
                    />
                  </TabsContent>
                  
                  {/* Letter Number Tab */}
                  <TabsContent value="letter" className="p-6 mt-0">
                    <LetterNumberBuilder
                      config={templateData.letterNumber || DEFAULT_LETTER_NUMBER_CONFIG}
                      onChange={(letterNumber) => updateTemplateData({ letterNumber })}
                    />
                  </TabsContent>
                  
                  {/* Content Tab */}
                  <TabsContent value="content" className="p-6 mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Content Blocks</h3>
                          <p className="text-sm text-muted-foreground">
                            Susun konten surat dengan block editor
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setShowVariablePicker(true)}
                          className="gap-2"
                        >
                          <Variable className="h-4 w-4" />
                          Lihat Variabel
                        </Button>
                      </div>
                      
                      <ContentBlockEditor
                        blocks={templateData.blocks}
                        onChange={(blocks) => updateTemplateData({ blocks })}
                        onInsertVariable={handleInsertVariable}
                      />
                    </div>
                  </TabsContent>
                  
                  {/* Footer Tab */}
                  <TabsContent value="footer" className="mt-0">
                    <FooterBuilder
                      config={templateData.footer}
                      onChange={(footer) => updateTemplateData({ footer })}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
            
            {/* Preview Panel */}
            {showPreview && (
              <div className="w-1/2 border-l bg-muted/30 overflow-y-auto">
                <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
                  <h3 className="font-semibold">Preview Template</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-6">
                  <div className="bg-white shadow-lg">
                    <TemplatePreview
                      template={templateData}
                      desaSettings={desaSettings}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer Actions */}
          <div className="border-t px-6 py-4 flex items-center justify-between bg-muted/30">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Sembunyikan' : 'Tampilkan'} Preview
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={!templateData.name.trim()}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Save className="h-4 w-4" />
                Simpan Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Variable Picker Dialog */}
      <Dialog open={showVariablePicker} onOpenChange={setShowVariablePicker}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Variable className="h-5 w-5" />
              Pilih Variabel
            </DialogTitle>
            <DialogDescription>
              Klik variabel untuk {currentBlockId ? 'menambahkan ke block' : 'melihat detail'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <VariablePicker
              onSelect={handleVariableSelect}
              usedVariables={usedVariables}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Template Library Dialog */}
      <TemplateLibraryDialog
        open={showLibrary}
        onOpenChange={setShowLibrary}
        onSelectTemplate={handleLoadTemplate}
      />
    </>
  );
}