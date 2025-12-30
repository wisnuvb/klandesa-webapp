import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Bold, Underline } from 'lucide-react';

interface StyleControlsProps {
  bold: boolean;
  underline?: boolean;
  onBoldChange: (checked: boolean) => void;
  onUnderlineChange?: (checked: boolean) => void;
  showUnderline?: boolean;
}

export function StyleControls({ 
  bold, 
  underline = false,
  onBoldChange, 
  onUnderlineChange,
  showUnderline = true 
}: StyleControlsProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Bold Switch */}
      <div className="space-y-2">
        <Label className="text-xs">Bold</Label>
        <div className="flex items-center gap-2 h-8">
          <Switch
            checked={bold}
            onCheckedChange={onBoldChange}
          />
          <Bold className={`h-4 w-4 ${bold ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
      </div>

      {/* Underline Switch */}
      {showUnderline && (
        <div className="space-y-2">
          <Label className="text-xs">Underline</Label>
          <div className="flex items-center gap-2 h-8">
            <Switch
              checked={underline}
              onCheckedChange={onUnderlineChange}
            />
            <Underline className={`h-4 w-4 ${underline ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>
      )}
    </div>
  );
}
