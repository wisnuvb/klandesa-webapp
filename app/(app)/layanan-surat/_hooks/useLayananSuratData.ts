"use client";

import { useState, useEffect } from "react";
import type { TemplateBody, LetterHistory } from "../types";

/**
 * Hook untuk fetch dan menyimpan daftar template surat & history surat.
 */
export function useLayananSuratData() {
  const [templates, setTemplates] = useState<TemplateBody[]>([]);
  const [history, setHistory] = useState<LetterHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [templatesRes, historyRes] = await Promise.all([
        fetch("/api/mail-templates"),
        fetch("/api/mail-services"),
      ]);

      if (templatesRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any[] = await templatesRes.json();
        setTemplates(
          data.map((t) => {
            const ts = t.templateStructure || {};
            return {
              id: t.id,
              name: t.name,
              description: t.description,
              category: t.category,
              content_template: t.contentTemplate,
              variables: ts.variables || [],
              header: ts.header || ts.shared_header,
              footer: ts.footer || ts.shared_footer,
              shared_header: ts.shared_header,
              shared_footer: ts.shared_footer,
              blocks: ts.blocks || [],
              pages: ts.pages || [],
              is_multi_page: ts.is_multi_page || false,
              letterNumber: ts.letterNumber,
              show_header: ts.show_header,
              show_footer: ts.show_footer,
              show_header_default: ts.show_header_default,
              show_footer_default: ts.show_footer_default,
              variable_groups: ts.variable_groups,
              is_active: t.isActive,
              created_at: t.createdAt,
              usage_count: t.usageCount,
            };
          }),
        );
      }

      if (historyRes.ok) {
        setHistory(await historyRes.json());
      }
    } catch (error) {
      console.error("Error fetching layanan surat data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { templates, history, isLoading, refetch: fetchData };
}
