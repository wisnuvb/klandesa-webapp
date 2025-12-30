import { useState } from 'react';
import { Plus, Trash2, Edit2, Users, FileText, Home, UserCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { VariableGroup, AVAILABLE_VARIABLES } from './types';

interface VariableGroupManagerProps {
  variableGroups: VariableGroup[];
  onUpdateGroups: (groups: VariableGroup[]) => void;
}

const ICON_MAP: Record<string, any> = {
  users: Users,
  'file-text': FileText,
  home: Home,
  'user-circle': UserCircle,
};

export function VariableGroupManager({ variableGroups, onUpdateGroups }: VariableGroupManagerProps) {
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<VariableGroup | null>(null);
  const [newGroup, setNewGroup] = useState<Partial<VariableGroup>>({
    title: '',
    description: '',
    variables: [],
    icon: 'users',
  });

  const handleAddGroup = () => {
    if (!newGroup.title) return;

    const group: VariableGroup = {
      id: `group_${Date.now()}`,
      title: newGroup.title,
      description: newGroup.description,
      variables: newGroup.variables || [],
      icon: newGroup.icon,
    };

    onUpdateGroups([...variableGroups, group]);
    setNewGroup({ title: '', description: '', variables: [], icon: 'users' });
    setIsAddingGroup(false);
  };

  const handleUpdateGroup = (groupId: string, updates: Partial<VariableGroup>) => {
    onUpdateGroups(
      variableGroups.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );
  };

  const handleDeleteGroup = (groupId: string) => {
    onUpdateGroups(variableGroups.filter((g) => g.id !== groupId));
  };

  const toggleVariableInGroup = (groupId: string, variableKey: string) => {
    const group = variableGroups.find((g) => g.id === groupId);
    if (!group) return;

    const variables = group.variables.includes(variableKey)
      ? group.variables.filter((v) => v !== variableKey)
      : [...group.variables, variableKey];

    handleUpdateGroup(groupId, { variables });
  };

  // Group available variables by category
  const variablesByCategory = AVAILABLE_VARIABLES.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_VARIABLES>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Variable Groups</h3>
          <p className="text-sm text-muted-foreground">
            Organize variables untuk form input yang lebih terstruktur
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddingGroup(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Group
        </Button>
      </div>

      {/* Groups List */}
      <div className="space-y-3">
        {variableGroups.map((group) => {
          const IconComponent = ICON_MAP[group.icon || 'users'] || Users;
          
          return (
            <Card key={group.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{group.title}</CardTitle>
                    <Badge variant="outline">{group.variables.length} variables</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingGroup(group)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {group.variables.map((varKey) => {
                    const variable = AVAILABLE_VARIABLES.find((v) => v.key === varKey);
                    return (
                      <Badge key={varKey} variant="secondary" className="text-xs">
                        {variable?.label || varKey}
                      </Badge>
                    );
                  })}
                  {group.variables.length === 0 && (
                    <p className="text-sm text-muted-foreground">Belum ada variables</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {variableGroups.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Belum ada variable groups. Tambahkan untuk mengorganisir form input.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Group Dialog */}
      <Dialog open={isAddingGroup || !!editingGroup} onOpenChange={(open) => {
        if (!open) {
          setIsAddingGroup(false);
          setEditingGroup(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Variable Group' : 'Tambah Variable Group'}
            </DialogTitle>
            <DialogDescription>
              Group variables berdasarkan kategori untuk form input yang lebih terorganisir
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Group</Label>
              <Input
                value={editingGroup?.title || newGroup.title}
                onChange={(e) =>
                  editingGroup
                    ? handleUpdateGroup(editingGroup.id, { title: e.target.value })
                    : setNewGroup({ ...newGroup, title: e.target.value })
                }
                placeholder="e.g., Data Calon Suami"
              />
            </div>

            <div className="space-y-2">
              <Label>Deskripsi (Optional)</Label>
              <Textarea
                value={editingGroup?.description || newGroup.description}
                onChange={(e) =>
                  editingGroup
                    ? handleUpdateGroup(editingGroup.id, { description: e.target.value })
                    : setNewGroup({ ...newGroup, description: e.target.value })
                }
                placeholder="Informasi lengkap calon suami untuk surat pengantar nikah"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Pilih Variables</Label>
              <div className="border rounded-lg p-4 space-y-4 max-h-[300px] overflow-y-auto">
                {Object.entries(variablesByCategory).map(([category, variables]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm mb-2">{category}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {variables.map((variable) => {
                        const isSelected = editingGroup
                          ? editingGroup.variables.includes(variable.key)
                          : newGroup.variables?.includes(variable.key);

                        return (
                          <Button
                            key={variable.key}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start text-xs h-auto py-2"
                            onClick={() => {
                              if (editingGroup) {
                                toggleVariableInGroup(editingGroup.id, variable.key);
                              } else {
                                const vars = newGroup.variables || [];
                                setNewGroup({
                                  ...newGroup,
                                  variables: vars.includes(variable.key)
                                    ? vars.filter((v) => v !== variable.key)
                                    : [...vars, variable.key],
                                });
                              }
                            }}
                          >
                            {variable.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                className="flex-1"
                onClick={() => {
                  if (editingGroup) {
                    setEditingGroup(null);
                  } else {
                    handleAddGroup();
                  }
                }}
                disabled={!(editingGroup?.title || newGroup.title)}
              >
                {editingGroup ? 'Simpan Perubahan' : 'Tambah Group'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingGroup(false);
                  setEditingGroup(null);
                  setNewGroup({ title: '', description: '', variables: [], icon: 'users' });
                }}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
