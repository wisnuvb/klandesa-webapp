import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface TemplateData {
  id: string;
  name: string;
  content: unknown;
}

interface TemplateState {
  templates: TemplateData[];
  currentTemplate: TemplateData | null;
  isLoading: boolean;

  // Actions
  setTemplates: (templates: TemplateData[]) => void;
  setCurrentTemplate: (template: TemplateData | null) => void;
  addTemplate: (template: TemplateData) => void;
  updateTemplate: (id: string, updates: Partial<TemplateData>) => void;
  deleteTemplate: (id: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useTemplateStore = create<TemplateState>()(
  devtools(
    persist(
      (set) => ({
        templates: [],
        currentTemplate: null,
        isLoading: false,

        setTemplates: (templates) => set({ templates }),
        setCurrentTemplate: (template) => set({ currentTemplate: template }),
        addTemplate: (template) =>
          set((state) => ({ templates: [...state.templates, template] })),
        updateTemplate: (id, updates) =>
          set((state) => ({
            templates: state.templates.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
            currentTemplate:
              state.currentTemplate?.id === id
                ? { ...state.currentTemplate, ...updates }
                : state.currentTemplate,
          })),
        deleteTemplate: (id) =>
          set((state) => ({
            templates: state.templates.filter((t) => t.id !== id),
            currentTemplate:
              state.currentTemplate?.id === id ? null : state.currentTemplate,
          })),
        setLoading: (loading) => set({ isLoading: loading }),
        reset: () =>
          set({
            templates: [],
            currentTemplate: null,
            isLoading: false,
          }),
      }),
      {
        name: "template-store",
      }
    )
  )
);
