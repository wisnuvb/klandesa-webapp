"use client";

import { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/** Sama dengan `@import` di app/styles/fonts.css — dipakai jendela cetak agar font pasti tersedia. */
const LETTER_PRINT_GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;0,7..72,700;1,7..72,400&display=swap";

async function waitForFontsReady(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.ready) return;
  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
}

/**
 * Hook untuk mengurus export PDF dan cetak surat.
 * Mengembalikan refs untuk tiap dialog preview serta fungsi export.
 */
export function useLetterExport() {
  const createLetterPreviewRef = useRef<HTMLDivElement>(null);
  const templatePreviewRef = useRef<HTMLDivElement>(null);
  const historyLetterPreviewRef = useRef<HTMLDivElement>(null);

  const downloadPreviewAsPdf = async (
    targetRef: { current: HTMLDivElement | null },
    fallbackName: string,
  ) => {
    const element = targetRef.current;
    if (!element) return;

    const sanitizedName = fallbackName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${sanitizedName || "Surat"}.pdf`;

    try {
      await waitForFontsReady();
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(filename);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Fallback ketika html2canvas tidak bisa parse warna oklch/lab
      if (errorMessage.includes("unsupported color function")) {
        const fallbackPdf = new jsPDF("p", "mm", "a4");
        const margin = 15;
        const maxWidth = 210 - margin * 2;
        const content =
          element.innerText
            ?.split("\n")
            .map((line) => line.trimEnd())
            .join("\n") || "";
        const lines = fallbackPdf.splitTextToSize(content, maxWidth);
        let y = margin;
        lines.forEach((line: string) => {
          if (y > 287) { fallbackPdf.addPage(); y = margin; }
          fallbackPdf.text(line, margin, y);
          y += 6;
        });
        fallbackPdf.save(filename);
        return;
      }
      console.error("Error generating PDF:", error);
    }
  };

  const printPreview = (
    targetRef: { current: HTMLDivElement | null },
    title = "Cetak Surat",
  ) => {
    const content = targetRef.current?.outerHTML;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]'),
    ).map((el) => el.outerHTML).join("\n");

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <link rel="stylesheet" href="${LETTER_PRINT_GOOGLE_FONTS_HREF}" />
          ${styles}
          <style>
            body { margin: 0; background: #fff; }
            .print-container { padding: 24px; }
            @media print {
              @page { margin: 12mm; }
              .print-container { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">${content}</div>
          <script>
            function runPrint() {
              function go() {
                window.focus();
                window.print();
                window.onafterprint = function () { window.close(); };
              }
              if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(go).catch(go);
              } else {
                setTimeout(go, 200);
              }
            }
            window.onload = runPrint;
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return {
    createLetterPreviewRef,
    templatePreviewRef,
    historyLetterPreviewRef,
    downloadPreviewAsPdf,
    printPreview,
  };
}
