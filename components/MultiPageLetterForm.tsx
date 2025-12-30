import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Users, FileText, Home, UserCircle, Heart } from 'lucide-react';
import { TemplateData, VariableGroup, AVAILABLE_VARIABLES } from './template-builder/types';

interface MultiPageLetterFormProps {
  template: TemplateData;
  formData: Record<string, string>;
  onFormDataChange: (data: Record<string, string>) => void;
}

const ICON_MAP: Record<string, any> = {
  users: Users,
  'file-text': FileText,
  home: Home,
  'user-circle': UserCircle,
  heart: Heart,
};

export function MultiPageLetterForm({ template, formData, onFormDataChange }: MultiPageLetterFormProps) {
  const [activeGroup, setActiveGroup] = useState<string>('all');
  
  const isMultiPage = template.is_multi_page && template.variable_groups && template.variable_groups.length > 0;
  const variableGroups = template.variable_groups || [];
  
  const handleInputChange = (key: string, value: string) => {
    onFormDataChange({ ...formData, [key]: value });
  };
  
  const renderInput = (variableKey: string) => {
    const variable = AVAILABLE_VARIABLES.find(v => v.key === variableKey);
    const label = variable?.label || variableKey;
    const value = formData[variableKey] || '';
    
    // Special handling for certain fields
    if (variableKey.includes('ALAMAT') || variableKey === 'KEPERLUAN') {
      return (
        <div key={variableKey} className="space-y-2">
          <Label htmlFor={variableKey}>{label}</Label>
          <Textarea
            id={variableKey}
            value={value}
            onChange={(e) => handleInputChange(variableKey, e.target.value)}
            placeholder={`Masukkan ${label.toLowerCase()}`}
            rows={3}
          />
        </div>
      );
    }
    
    return (
      <div key={variableKey} className="space-y-2">
        <Label htmlFor={variableKey}>{label}</Label>
        <Input
          id={variableKey}
          value={value}
          onChange={(e) => handleInputChange(variableKey, e.target.value)}
          placeholder={`Masukkan ${label.toLowerCase()}`}
        />
      </div>
    );
  };
  
  // If not multi-page, show all variables in single column
  if (!isMultiPage) {
    return (
      <div className="space-y-4">
        {template.variables.map(renderInput)}
      </div>
    );
  }
  
  // Multi-page mode with variable groups
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Isi Data Surat</h3>
        <p className="text-sm text-muted-foreground">
          Data diorganisir dalam grup untuk memudahkan pengisian. Isi semua field yang diperlukan.
        </p>
      </div>
      
      <Tabs value={activeGroup} onValueChange={setActiveGroup}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${variableGroups.length + 1}, minmax(0, 1fr))` }}>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4" />
            Semua
          </TabsTrigger>
          {variableGroups.map((group) => {
            const IconComponent = ICON_MAP[group.icon || 'users'] || Users;
            return (
              <TabsTrigger key={group.id} value={group.id} className="gap-2">
                <IconComponent className="h-4 w-4" />
                {group.title}
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {/* All Variables Tab */}
        <TabsContent value="all" className="mt-4 space-y-4">
          {variableGroups.map((group) => {
            const IconComponent = ICON_MAP[group.icon || 'users'] || Users;
            
            return (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{group.title}</CardTitle>
                    <Badge variant="outline">{group.variables.length} fields</Badge>
                  </div>
                  {group.description && (
                    <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.variables.map(renderInput)}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
        
        {/* Individual Group Tabs */}
        {variableGroups.map((group) => {
          const IconComponent = ICON_MAP[group.icon || 'users'] || Users;
          
          return (
            <TabsContent key={group.id} value={group.id} className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5 text-primary" />
                    <CardTitle>{group.title}</CardTitle>
                  </div>
                  {group.description && (
                    <p className="text-sm text-muted-foreground mt-2">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.variables.map(renderInput)}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
