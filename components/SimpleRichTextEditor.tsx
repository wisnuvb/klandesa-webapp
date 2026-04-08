import { useState, useRef, useEffect, type ComponentType } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon
} from 'lucide-react';
import { ImageAssetModal } from './ImageAssetModal';

type ToolbarIcon = ComponentType<{ className?: string }>;

function ToolbarButton({
  icon: Icon,
  title,
  active,
  onClick,
}: {
  icon: ToolbarIcon;
  title: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      className={`p-2 rounded-lg transition-all hover:scale-110 ${
        active
          ? 'bg-teal-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-gray-200" />;
}

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function SimpleRichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Mulai menulis...',
  minHeight = '300px'
}: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Initialize content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  // Update active formats on selection change
  const updateActiveFormats = () => {
    const formats = new Set<string>();
    
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikethrough');
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
    if (document.queryCommandState('insertOrderedList')) formats.add('ol');
    if (document.queryCommandState('justifyLeft')) formats.add('left');
    if (document.queryCommandState('justifyCenter')) formats.add('center');
    if (document.queryCommandState('justifyRight')) formats.add('right');
    
    // Check heading
    const selection = window.getSelection();
    if (selection && selection.anchorNode) {
      let node: Node | null = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'H1') formats.add('h1');
        if (node.nodeName === 'H2') formats.add('h2');
        if (node.nodeName === 'H3') formats.add('h3');
        node = node.parentNode;
      }
    }
    
    setActiveFormats(formats);
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveFormats();
    handleInput();
  };

  const formatBlock = (tag: string) => {
    document.execCommand('formatBlock', false, tag);
    editorRef.current?.focus();
    updateActiveFormats();
    handleInput();
  };

  const insertLink = () => {
    const url = prompt('Masukkan URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertImage = (url: string) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Inserted Image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.setEndAfter(img);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    editorRef.current?.focus();
    updateActiveFormats();
    handleInput();
  };

  return (
    <div className="border-2 border-gray-300 rounded-xl overflow-hidden focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
      {/* Toolbar */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Text Formatting Group */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
            <ToolbarButton 
              icon={Bold} 
              title="Bold (Ctrl+B)" 
              active={activeFormats.has('bold')}
              onClick={() => execCommand('bold')}
            />
            <ToolbarButton 
              icon={Italic} 
              title="Italic (Ctrl+I)" 
              active={activeFormats.has('italic')}
              onClick={() => execCommand('italic')}
            />
            <ToolbarButton 
              icon={Underline} 
              title="Underline (Ctrl+U)" 
              active={activeFormats.has('underline')}
              onClick={() => execCommand('underline')}
            />
            <ToolbarButton 
              icon={Strikethrough} 
              title="Strikethrough" 
              active={activeFormats.has('strikethrough')}
              onClick={() => execCommand('strikeThrough')}
            />
          </div>

          <Divider />

          {/* Heading Group */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
            <ToolbarButton 
              icon={Type} 
              title="Normal Text" 
              active={!activeFormats.has('h1') && !activeFormats.has('h2') && !activeFormats.has('h3')}
              onClick={() => formatBlock('p')}
            />
            <ToolbarButton 
              icon={Heading1} 
              title="Heading 1" 
              active={activeFormats.has('h1')}
              onClick={() => formatBlock('h1')}
            />
            <ToolbarButton 
              icon={Heading2} 
              title="Heading 2" 
              active={activeFormats.has('h2')}
              onClick={() => formatBlock('h2')}
            />
            <ToolbarButton 
              icon={Heading3} 
              title="Heading 3" 
              active={activeFormats.has('h3')}
              onClick={() => formatBlock('h3')}
            />
          </div>

          <Divider />

          {/* List Group */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
            <ToolbarButton 
              icon={List} 
              title="Bulleted List" 
              active={activeFormats.has('ul')}
              onClick={() => execCommand('insertUnorderedList')}
            />
            <ToolbarButton 
              icon={ListOrdered} 
              title="Numbered List" 
              active={activeFormats.has('ol')}
              onClick={() => execCommand('insertOrderedList')}
            />
          </div>

          <Divider />

          {/* Alignment Group */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
            <ToolbarButton 
              icon={AlignLeft} 
              title="Align Left" 
              active={activeFormats.has('left')}
              onClick={() => execCommand('justifyLeft')}
            />
            <ToolbarButton 
              icon={AlignCenter} 
              title="Align Center" 
              active={activeFormats.has('center')}
              onClick={() => execCommand('justifyCenter')}
            />
            <ToolbarButton 
              icon={AlignRight} 
              title="Align Right" 
              active={activeFormats.has('right')}
              onClick={() => execCommand('justifyRight')}
            />
          </div>

          <Divider />

          {/* Link & Actions */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
            <ToolbarButton 
              icon={LinkIcon} 
              title="Insert Link" 
              onClick={insertLink}
            />
            <ToolbarButton 
              icon={ImageIcon} 
              title="Insert Image" 
              onClick={() => setShowImageModal(true)}
            />
          </div>

          <Divider />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
            <ToolbarButton 
              icon={Undo} 
              title="Undo (Ctrl+Z)" 
              onClick={() => execCommand('undo')}
            />
            <ToolbarButton 
              icon={Redo} 
              title="Redo (Ctrl+Y)" 
              onClick={() => execCommand('redo')}
            />
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onMouseUp={updateActiveFormats}
        onKeyUp={updateActiveFormats}
        className="px-4 py-3 outline-none prose prose-sm max-w-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />

      <style>{`
        [contentEditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          position: absolute;
        }
        
        [contentEditable] {
          font-family: 'Inter', sans-serif;
          color: #1f2937;
          line-height: 1.75;
        }
        
        [contentEditable] h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 0.5em 0;
          color: #111827;
        }
        
        [contentEditable] h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.5em 0;
          color: #111827;
        }
        
        [contentEditable] h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.5em 0;
          color: #111827;
        }
        
        [contentEditable] p {
          margin: 0.5em 0;
        }
        
        [contentEditable] ul,
        [contentEditable] ol {
          margin: 0.5em 0;
          padding-left: 2em;
        }
        
        [contentEditable] li {
          margin: 0.25em 0;
        }
        
        [contentEditable] a {
          color: #0d9488;
          text-decoration: underline;
        }
        
        [contentEditable] a:hover {
          color: #0f766e;
        }
        
        [contentEditable] strong,
        [contentEditable] b {
          font-weight: 700;
        }
        
        [contentEditable] em,
        [contentEditable] i {
          font-style: italic;
        }
        
        [contentEditable] u {
          text-decoration: underline;
        }
        
        [contentEditable] strike {
          text-decoration: line-through;
        }
        
        [contentEditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* Image Asset Modal */}
      <ImageAssetModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onSelectImage={insertImage}
      />
    </div>
  );
}
