import { useState } from 'react';
import { Search, X, Tag } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AVAILABLE_VARIABLES } from './types';

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  usedVariables?: string[];
}

export function VariablePicker({ onSelect, usedVariables = [] }: VariablePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredVariables = AVAILABLE_VARIABLES.filter(
    v => 
      v.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.key.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const groupedVariables = filteredVariables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_VARIABLES>);
  
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari variabel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      {/* Used Variables */}
      {usedVariables.length > 0 && (
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Variabel yang Digunakan</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {usedVariables.map((variable) => (
              <Badge key={variable} variant="secondary" className="gap-1">
                {variable}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Variable List */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedVariables).map(([category, variables]) => (
          <div key={category} className="mb-6 last:mb-0">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              {category}
            </h4>
            <div className="space-y-2">
              {variables.map((variable) => {
                const isUsed = usedVariables.includes(variable.key);
                return (
                  <Button
                    key={variable.key}
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                    onClick={() => onSelect(variable.key)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{variable.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {`{${variable.key}}`}
                      </span>
                    </div>
                    {isUsed && (
                      <Badge variant="secondary" className="text-xs">
                        Digunakan
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
