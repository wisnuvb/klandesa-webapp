import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';
import { TemplateData, TemplatePage } from './types';
import * as TemplateRenderer from '../../utils/templateRenderer';
import {
  isFooterBlockVisible,
  isLetterheadVisible,
} from '../../utils/letterheadVisibility';

interface MultiPagePreviewProps {
  template: TemplateData;
  desaSettings: {
    nama_desa: string;
    kabupaten: string;
    kecamatan: string;
    alamat_desa: string;
    kode_pos: string;
    kepala_desa_nama: string;
    kepala_desa_nip?: string | null;
  };
  onClose: () => void;
}

export function MultiPagePreview({ template, desaSettings, onClose }: MultiPagePreviewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  const isMultiPage = template.is_multi_page && template.pages && template.pages.length > 0;
  const pages = isMultiPage ? template.pages! : null;
  const totalPages = pages?.length || 1;
  
  // Dummy data for preview
  const dummyData: Record<string, string> = {
    NOMOR_SURAT: '475/039/424.304.2.02/2024',
    NOMOR_URUT: '015', // Auto-generated number (example)
    BULAN_ROMAWI: 'XII',
    TAHUN: '2024',
    TANGGAL_SURAT: '20 Desember 2024',
    NAMA_DESA: desaSettings.nama_desa,
    KABUPATEN: desaSettings.kabupaten,
    KECAMATAN: desaSettings.kecamatan,
    ALAMAT_DESA: desaSettings.alamat_desa,
    KODE_POS: desaSettings.kode_pos,
    KEPALA_DESA_NAMA: desaSettings.kepala_desa_nama,
    KEPALA_DESA_NIP: desaSettings.kepala_desa_nip || "19800101 200801 1 001",
    NAMA: 'Ahmad Suryadi',
    NIK: '3201012801850001',
    TEMPAT_LAHIR: 'Bandung',
    TANGGAL_LAHIR: '28 Januari 1985',
    JENIS_KELAMIN: 'Laki-laki',
    AGAMA: 'Islam',
    PEKERJAAN: 'Wiraswasta',
    ALAMAT: 'Jl. Merdeka No. 123, RT 01/RW 02',
    STATUS_PERKAWINAN: 'Belum Kawin',
    KEWARGANEGARAAN: 'Indonesia',
    KEPERLUAN: 'Melengkapi persyaratan menikah',
    // Data Pernikahan
    SUAMI_NAMA: 'Budi Santoso',
    SUAMI_NIK: '3201011234567890',
    SUAMI_TTL: 'Jakarta, 15 Mei 1990',
    SUAMI_AGAMA: 'Islam',
    SUAMI_PEKERJAAN: 'PNS',
    SUAMI_ALAMAT: 'Jl. Sudirman No. 45, Jakarta',
    SUAMI_STATUS_PERKAWINAN: 'Belum Kawin',
    SUAMI_KEWARGANEGARAAN: 'Indonesia',
    SUAMI_AYAH_NAMA: 'Santoso Wijaya',
    SUAMI_IBU_NAMA: 'Sri Rahayu',
    ISTRI_NAMA: 'Siti Nurhaliza',
    ISTRI_NIK: '3201019876543210',
    ISTRI_TTL: 'Bandung, 20 Agustus 1992',
    ISTRI_AGAMA: 'Islam',
    ISTRI_PEKERJAAN: 'Guru',
    ISTRI_ALAMAT: 'Jl. Gatot Subroto No. 12, Bandung',
    ISTRI_STATUS_PERKAWINAN: 'Belum Kawin',
    ISTRI_KEWARGANEGARAAN: 'Indonesia',
    ISTRI_AYAH_NAMA: 'Abdul Rahman',
    ISTRI_IBU_NAMA: 'Siti Aminah',
    WALI_NAMA: 'Abdul Rahman',
    WALI_NIK: '3201015555555555',
    WALI_ALAMAT: 'Jl. Gatot Subroto No. 12, Bandung',
    WALI_HUBUNGAN: 'Ayah Kandung',
  };
  
  const renderPage = (page: TemplatePage, pageNumber: number) => {
    const showHeader = isLetterheadVisible(template, page);
    const showFooter = isFooterBlockVisible(template, page);

    return (
      <div key={page.id} className="bg-white p-12 shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
        {/* Header */}
        {showHeader && TemplateRenderer.renderHeader(template.shared_header || template.header, dummyData, page.header)}
        
        {/* Letter Number */}
        {TemplateRenderer.renderLetterNumber(page.letterNumber, dummyData, page.header)}
        
        {/* Content Blocks */}
        <div className="space-y-3" style={{ fontFamily: 'Literata', fontSize: '14px', lineHeight: '1.8' }}>
          {page.blocks.map(block => TemplateRenderer.renderBlock(block, dummyData))}
        </div>
        
        {/* Footer */}
        {showFooter && TemplateRenderer.renderFooter(template.shared_footer || template.footer, dummyData, page.footer)}
        
        {/* Page Number */}
        <div className="text-center text-xs text-muted-foreground mt-8">
          Halaman {pageNumber} dari {totalPages}
        </div>
      </div>
    );
  };
  
  const renderSinglePage = () => {
    const showHeader = isLetterheadVisible(template);
    const showFooter = isFooterBlockVisible(template);

    return (
      <div className="bg-white p-12 shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
        {/* Header */}
        {showHeader && TemplateRenderer.renderHeader(template.header, dummyData)}
        
        {/* Letter Number */}
        {TemplateRenderer.renderLetterNumber(template.letterNumber, dummyData)}
        
        {/* Content Blocks */}
        <div className="space-y-3" style={{ fontFamily: 'Literata', fontSize: '14px', lineHeight: '1.8' }}>
          {template.blocks.map(block => TemplateRenderer.renderBlock(block, dummyData))}
        </div>
        
        {/* Footer */}
        {showFooter && TemplateRenderer.renderFooter(template.footer, dummyData)}
      </div>
    );
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Preview: {template.name}</DialogTitle>
              <DialogDescription>
                {isMultiPage ? `Preview template multi-halaman dengan ${totalPages} halaman` : 'Preview template surat'}
              </DialogDescription>
              {isMultiPage && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge>Multi-Page</Badge>
                  <Badge variant="outline">{totalPages} Halaman</Badge>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
          {isMultiPage && pages ? (
            <div className="space-y-8">
              {/* Page Navigation */}
              <div className="flex items-center justify-center gap-4 sticky top-0 z-10 bg-gray-100 py-4 hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                  disabled={currentPageIndex === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="px-4 py-2 bg-white rounded-lg border">
                  <span className="font-medium">
                    Halaman {currentPageIndex + 1} dari {totalPages}
                  </span>
                  {pages[currentPageIndex]?.title && (
                    <span className="text-sm text-muted-foreground ml-2">
                      - {pages[currentPageIndex].title}
                    </span>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPageIndex(Math.min(totalPages - 1, currentPageIndex + 1))}
                  disabled={currentPageIndex === totalPages - 1}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Current Page */}
              {renderPage(pages[currentPageIndex], currentPageIndex + 1)}
            </div>
          ) : (
            renderSinglePage()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
