"use client";

import { useState, useEffect } from "react";
import type { TemplateBody, LetterHistory } from "../types";
import { mapApiMailTemplateToBody } from "../_utils/mapMailTemplate";

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
        setTemplates(data.map((t) => mapApiMailTemplateToBody(t)));
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
