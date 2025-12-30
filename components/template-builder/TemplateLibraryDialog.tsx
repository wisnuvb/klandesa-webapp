import { useState } from 'react';
import { FileText, CheckCircle2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TemplateData, DEFAULT_HEADER_CONFIG } from './types';

interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  template: TemplateData;
}

// Template Presets
const presetTemplates: PresetTemplate[] = [
  {
    id: 'domisili',
    name: 'Surat Keterangan Domisili',
    description: 'Template untuk surat keterangan domisili warga',
    category: 'Keterangan',
    icon: '🏠',
    template: {
      name: 'Surat Keterangan Domisili',
      description: 'Template untuk surat keterangan domisili warga',
      category: 'Keterangan',
      is_multi_page: false,
      header: DEFAULT_HEADER_CONFIG,
      blocks: [
        {
          id: 'heading-1',
          type: 'heading',
          content: 'SURAT KETERANGAN DOMISILI',
          style: { align: 'center', size: 'large', bold: true }
        },
        {
          id: 'nomor-1',
          type: 'text',
          content: 'Nomor: {NOMOR_SURAT}',
          style: { align: 'center', size: 'small', bold: false }
        },
        {
          id: 'spacer-1',
          type: 'spacer',
          content: '',
          style: { size: 'medium' }
        },
        {
          id: 'text-1',
          type: 'text',
          content: 'Yang bertanda tangan di bawah ini {KEPALA_DESA_NAMA}, Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, dengan ini menerangkan bahwa:',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-2',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'table-1',
          type: 'table',
          content: [
            { label: 'Nama Lengkap', value: '{NAMA_LENGKAP}' },
            { label: 'NIK', value: '{NIK}' },
            { label: 'Tempat, Tanggal Lahir', value: '{TEMPAT_LAHIR}, {TANGGAL_LAHIR}' },
            { label: 'Jenis Kelamin', value: '{JENIS_KELAMIN}' },
            { label: 'Pekerjaan', value: '{PEKERJAAN}' },
            { label: 'Agama', value: '{AGAMA}' },
            { label: 'Status Perkawinan', value: '{STATUS_KAWIN}' },
            { label: 'Alamat', value: '{ALAMAT_LENGKAP}' }
          ]
        },
        {
          id: 'spacer-3',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-2',
          type: 'text',
          content: 'Adalah benar warga Desa {NAMA_DESA} yang berdomisili di alamat tersebut di atas.',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-4',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-3',
          type: 'text',
          content: 'Demikian surat keterangan ini dibuat dengan sebenarnya untuk {KEPERLUAN}.',
          style: { align: 'justify', size: 'medium', bold: false }
        }
      ],
      footer: {
        footer_type: 'single',
        signers: [
          {
            role: 'Kepala Desa',
            name: '{KEPALA_DESA_NAMA}',
            on_behalf_of: null,
            position: 'right',
            show_stamp: true,
            prefix_text: null,
            nip: '{NIP_KEPALA_DESA}'
          }
        ],
        location: '{NAMA_DESA}',
        date_format: 'auto',
        custom_note: null
      },
      variables: ['NOMOR_SURAT', 'NAMA_LENGKAP', 'NIK', 'TEMPAT_LAHIR', 'TANGGAL_LAHIR', 'JENIS_KELAMIN', 'PEKERJAAN', 'AGAMA', 'STATUS_KAWIN', 'ALAMAT_LENGKAP', 'KEPERLUAN'],
      is_active: true
    }
  },
  {
    id: 'usaha',
    name: 'Surat Keterangan Usaha',
    description: 'Template untuk surat keterangan usaha/UMKM',
    category: 'Keterangan',
    icon: '💼',
    template: {
      name: 'Surat Keterangan Usaha',
      description: 'Template untuk surat keterangan usaha/UMKM',
      category: 'Keterangan',
      header: DEFAULT_HEADER_CONFIG,
      blocks: [
        {
          id: 'heading-1',
          type: 'heading',
          content: 'SURAT KETERANGAN USAHA',
          style: { align: 'center', size: 'large', bold: true }
        },
        {
          id: 'nomor-1',
          type: 'text',
          content: 'Nomor: {NOMOR_SURAT}',
          style: { align: 'center', size: 'small', bold: false }
        },
        {
          id: 'spacer-1',
          type: 'spacer',
          content: '',
          style: { size: 'medium' }
        },
        {
          id: 'text-1',
          type: 'text',
          content: 'Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-2',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'table-1',
          type: 'table',
          content: [
            { label: 'Nama Lengkap', value: '{NAMA_LENGKAP}' },
            { label: 'NIK', value: '{NIK}' },
            { label: 'Tempat, Tanggal Lahir', value: '{TEMPAT_LAHIR}, {TANGGAL_LAHIR}' },
            { label: 'Pekerjaan', value: '{PEKERJAAN}' },
            { label: 'Alamat', value: '{ALAMAT_LENGKAP}' }
          ]
        },
        {
          id: 'spacer-3',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-2',
          type: 'text',
          content: 'Adalah benar memiliki usaha dengan data sebagai berikut:',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-4',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'table-2',
          type: 'table',
          content: [
            { label: 'Nama Usaha', value: '{NAMA_USAHA}' },
            { label: 'Jenis Usaha', value: '{JENIS_USAHA}' },
            { label: 'Alamat Usaha', value: '{ALAMAT_USAHA}' },
            { label: 'Tahun Berdiri', value: '{TAHUN_BERDIRI}' }
          ]
        },
        {
          id: 'spacer-5',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-3',
          type: 'text',
          content: 'Demikian surat keterangan ini dibuat untuk {KEPERLUAN}.',
          style: { align: 'justify', size: 'medium', bold: false }
        }
      ],
      footer: {
        footer_type: 'single',
        signers: [
          {
            role: 'Kepala Desa',
            name: '{KEPALA_DESA_NAMA}',
            on_behalf_of: null,
            position: 'right',
            show_stamp: true,
            prefix_text: null,
            nip: null
          }
        ],
        location: '{NAMA_DESA}',
        date_format: 'auto',
        custom_note: null
      },
      variables: ['NOMOR_SURAT', 'NAMA_LENGKAP', 'NIK', 'TEMPAT_LAHIR', 'TANGGAL_LAHIR', 'PEKERJAAN', 'ALAMAT_LENGKAP', 'NAMA_USAHA', 'JENIS_USAHA', 'ALAMAT_USAHA', 'TAHUN_BERDIRI', 'KEPERLUAN'],
      is_active: true
    }
  },
  {
    id: 'pengantar',
    name: 'Surat Pengantar',
    description: 'Template surat pengantar untuk berbagai keperluan',
    category: 'Pengantar',
    icon: '📋',
    template: {
      name: 'Surat Pengantar',
      description: 'Template surat pengantar untuk berbagai keperluan',
      category: 'Pengantar',
      is_multi_page: false,
      header: DEFAULT_HEADER_CONFIG,
      blocks: [
        {
          id: 'heading-1',
          type: 'heading',
          content: 'SURAT PENGANTAR',
          style: { align: 'center', size: 'large', bold: true }
        },
        {
          id: 'nomor-1',
          type: 'text',
          content: 'Nomor: {NOMOR_SURAT}',
          style: { align: 'center', size: 'small', bold: false }
        },
        {
          id: 'spacer-1',
          type: 'spacer',
          content: '',
          style: { size: 'medium' }
        },
        {
          id: 'text-1',
          type: 'text',
          content: 'Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, dengan ini menerangkan bahwa:',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-2',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'table-1',
          type: 'table',
          content: [
            { label: 'Nama Lengkap', value: '{NAMA_LENGKAP}' },
            { label: 'NIK', value: '{NIK}' },
            { label: 'Tempat, Tanggal Lahir', value: '{TEMPAT_LAHIR}, {TANGGAL_LAHIR}' },
            { label: 'Pekerjaan', value: '{PEKERJAAN}' },
            { label: 'Alamat', value: '{ALAMAT_LENGKAP}' }
          ]
        },
        {
          id: 'spacer-3',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-2',
          type: 'text',
          content: 'Dengan ini kami tujukan yang bersangkutan untuk {TUJUAN_SURAT}.',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-4',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-3',
          type: 'text',
          content: 'Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.',
          style: { align: 'justify', size: 'medium', bold: false }
        }
      ],
      footer: {
        footer_type: 'single',
        signers: [
          {
            role: 'Kepala Desa',
            name: '{KEPALA_DESA_NAMA}',
            on_behalf_of: null,
            position: 'right',
            show_stamp: true,
            prefix_text: null,
            nip: null
          }
        ],
        location: '{NAMA_DESA}',
        date_format: 'auto',
        custom_note: null
      },
      variables: ['NOMOR_SURAT', 'NAMA_LENGKAP', 'NIK', 'TEMPAT_LAHIR', 'TANGGAL_LAHIR', 'PEKERJAAN', 'ALAMAT_LENGKAP', 'TUJUAN_SURAT'],
      is_active: true
    }
  },
  {
    id: 'tidak-mampu',
    name: 'Surat Keterangan Tidak Mampu',
    description: 'Template untuk SKTM (Surat Keterangan Tidak Mampu)',
    category: 'Keterangan',
    icon: '💰',
    template: {
      name: 'Surat Keterangan Tidak Mampu',
      description: 'Template untuk SKTM (Surat Keterangan Tidak Mampu)',
      category: 'Keterangan',
      header: DEFAULT_HEADER_CONFIG,
      blocks: [
        {
          id: 'heading-1',
          type: 'heading',
          content: 'SURAT KETERANGAN TIDAK MAMPU',
          style: { align: 'center', size: 'large', bold: true }
        },
        {
          id: 'nomor-1',
          type: 'text',
          content: 'Nomor: {NOMOR_SURAT}',
          style: { align: 'center', size: 'small', bold: false }
        },
        {
          id: 'spacer-1',
          type: 'spacer',
          content: '',
          style: { size: 'medium' }
        },
        {
          id: 'text-1',
          type: 'text',
          content: 'Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-2',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'table-1',
          type: 'table',
          content: [
            { label: 'Nama Lengkap', value: '{NAMA_LENGKAP}' },
            { label: 'NIK', value: '{NIK}' },
            { label: 'Tempat, Tanggal Lahir', value: '{TEMPAT_LAHIR}, {TANGGAL_LAHIR}' },
            { label: 'Jenis Kelamin', value: '{JENIS_KELAMIN}' },
            { label: 'Pekerjaan', value: '{PEKERJAAN}' },
            { label: 'Alamat', value: '{ALAMAT_LENGKAP}' }
          ]
        },
        {
          id: 'spacer-3',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-2',
          type: 'text',
          content: 'Adalah benar warga Desa {NAMA_DESA} yang tergolong keluarga TIDAK MAMPU / KURANG MAMPU secara ekonomi.',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-4',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-3',
          type: 'text',
          content: 'Surat keterangan ini dibuat untuk {KEPERLUAN}.',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-5',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-4',
          type: 'text',
          content: 'Demikian surat keterangan ini dibuat dengan sebenarnya, atas perhatiannya kami ucapkan terima kasih.',
          style: { align: 'justify', size: 'medium', bold: false }
        }
      ],
      footer: {
        footer_type: 'single',
        signers: [
          {
            role: 'Kepala Desa',
            name: '{KEPALA_DESA_NAMA}',
            on_behalf_of: null,
            position: 'right',
            show_stamp: true,
            prefix_text: null,
            nip: null
          }
        ],
        location: '{NAMA_DESA}',
        date_format: 'auto',
        custom_note: null
      },
      variables: ['NOMOR_SURAT', 'NAMA_LENGKAP', 'NIK', 'TEMPAT_LAHIR', 'TANGGAL_LAHIR', 'JENIS_KELAMIN', 'PEKERJAAN', 'ALAMAT_LENGKAP', 'KEPERLUAN'],
      is_active: true
    }
  },
  {
    id: 'kelahiran',
    name: 'Surat Keterangan Kelahiran',
    description: 'Template untuk surat keterangan kelahiran bayi',
    category: 'Keterangan',
    icon: '👶',
    template: {
      name: 'Surat Keterangan Kelahiran',
      description: 'Template untuk surat keterangan kelahiran bayi',
      category: 'Keterangan',
      header: DEFAULT_HEADER_CONFIG,
      blocks: [
        {
          id: 'heading-1',
          type: 'heading',
          content: 'SURAT KETERANGAN KELAHIRAN',
          style: { align: 'center', size: 'large', bold: true }
        },
        {
          id: 'nomor-1',
          type: 'text',
          content: 'Nomor: {NOMOR_SURAT}',
          style: { align: 'center', size: 'small', bold: false }
        },
        {
          id: 'spacer-1',
          type: 'spacer',
          content: '',
          style: { size: 'medium' }
        },
        {
          id: 'text-1',
          type: 'text',
          content: 'Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-2',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-2',
          type: 'text',
          content: 'Telah lahir seorang bayi dengan keterangan sebagai berikut:',
          style: { align: 'justify', size: 'medium', bold: true }
        },
        {
          id: 'spacer-3',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'table-1',
          type: 'table',
          content: [
            { label: 'Nama Bayi', value: '{NAMA_BAYI}' },
            { label: 'Jenis Kelamin', value: '{JENIS_KELAMIN_BAYI}' },
            { label: 'Hari/Tanggal Lahir', value: '{HARI_LAHIR}, {TANGGAL_LAHIR}' },
            { label: 'Waktu Lahir', value: '{WAKTU_LAHIR}' },
            { label: 'Tempat Lahir', value: '{TEMPAT_LAHIR}' },
            { label: 'Anak Ke', value: '{ANAK_KE}' }
          ]
        },
        {
          id: 'spacer-4',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-3',
          type: 'text',
          content: 'Dari seorang Ibu bernama:',
          style: { align: 'justify', size: 'medium', bold: true }
        },
        {
          id: 'spacer-5',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'table-2',
          type: 'table',
          content: [
            { label: 'Nama Lengkap', value: '{NAMA_IBU}' },
            { label: 'NIK', value: '{NIK_IBU}' },
            { label: 'Tempat, Tanggal Lahir', value: '{TEMPAT_LAHIR_IBU}, {TANGGAL_LAHIR_IBU}' },
            { label: 'Pekerjaan', value: '{PEKERJAAN_IBU}' },
            { label: 'Alamat', value: '{ALAMAT_IBU}' }
          ]
        },
        {
          id: 'spacer-6',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-4',
          type: 'text',
          content: 'Suami dari:',
          style: { align: 'justify', size: 'medium', bold: true }
        },
        {
          id: 'spacer-7',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'table-3',
          type: 'table',
          content: [
            { label: 'Nama Lengkap', value: '{NAMA_AYAH}' },
            { label: 'NIK', value: '{NIK_AYAH}' },
            { label: 'Tempat, Tanggal Lahir', value: '{TEMPAT_LAHIR_AYAH}, {TANGGAL_LAHIR_AYAH}' },
            { label: 'Pekerjaan', value: '{PEKERJAAN_AYAH}' },
            { label: 'Alamat', value: '{ALAMAT_AYAH}' }
          ]
        },
        {
          id: 'spacer-8',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-5',
          type: 'text',
          content: 'Demikian surat keterangan ini dibuat berdasarkan keterangan pelapor untuk dapat dipergunakan sebagaimana mestinya.',
          style: { align: 'justify', size: 'medium', bold: false }
        }
      ],
      footer: {
        footer_type: 'single',
        signers: [
          {
            role: 'Kepala Desa',
            name: '{KEPALA_DESA_NAMA}',
            on_behalf_of: null,
            position: 'right',
            show_stamp: true,
            prefix_text: null,
            nip: null
          }
        ],
        location: '{NAMA_DESA}',
        date_format: 'auto',
        custom_note: null
      },
      variables: ['NOMOR_SURAT', 'NAMA_BAYI', 'JENIS_KELAMIN_BAYI', 'HARI_LAHIR', 'TANGGAL_LAHIR', 'WAKTU_LAHIR', 'TEMPAT_LAHIR', 'ANAK_KE', 'NAMA_IBU', 'NIK_IBU', 'TEMPAT_LAHIR_IBU', 'TANGGAL_LAHIR_IBU', 'PEKERJAAN_IBU', 'ALAMAT_IBU', 'NAMA_AYAH', 'NIK_AYAH', 'TEMPAT_LAHIR_AYAH', 'TANGGAL_LAHIR_AYAH', 'PEKERJAAN_AYAH', 'ALAMAT_AYAH'],
      is_active: true
    }
  },
  {
    id: 'ahli-waris',
    name: 'Surat Keterangan Ahli Waris',
    description: 'Template untuk surat keterangan ahli waris',
    category: 'Keterangan',
    icon: '👥',
    template: {
      name: 'Surat Keterangan Ahli Waris',
      description: 'Template untuk surat keterangan ahli waris',
      category: 'Keterangan',
      is_multi_page: false,
      header: DEFAULT_HEADER_CONFIG,
      blocks: [
        {
          id: 'heading-1',
          type: 'heading',
          content: 'SURAT KETERANGAN AHLI WARIS',
          style: { align: 'center', size: 'large', bold: true }
        },
        {
          id: 'nomor-1',
          type: 'text',
          content: 'Nomor: {NOMOR_SURAT}',
          style: { align: 'center', size: 'small', bold: false }
        },
        {
          id: 'spacer-1',
          type: 'spacer',
          content: '',
          style: { size: 'medium' }
        },
        {
          id: 'text-1',
          type: 'text',
          content: 'Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-2',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'table-1',
          type: 'table',
          content: [
            { label: 'Nama Lengkap', value: '{NAMA_PEWARIS}' },
            { label: 'NIK', value: '{NIK_PEWARIS}' },
            { label: 'Tempat, Tanggal Lahir', value: '{TEMPAT_LAHIR_PEWARIS}, {TANGGAL_LAHIR_PEWARIS}' },
            { label: 'Tanggal Meninggal', value: '{TANGGAL_MENINGGAL}' },
            { label: 'Alamat', value: '{ALAMAT_PEWARIS}' }
          ]
        },
        {
          id: 'spacer-3',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-2',
          type: 'text',
          content: 'Telah meninggal dunia dan meninggalkan ahli waris sebagai berikut:',
          style: { align: 'justify', size: 'medium', bold: false }
        },
        {
          id: 'spacer-4',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-3',
          type: 'text',
          content: '{DAFTAR_AHLI_WARIS}',
          style: { align: 'left', size: 'medium', bold: false }
        },
        {
          id: 'spacer-5',
          type: 'spacer',
          content: '',
          style: { size: 'small' }
        },
        {
          id: 'text-4',
          type: 'text',
          content: 'Demikian surat keterangan ini dibuat untuk {KEPERLUAN}.',
          style: { align: 'justify', size: 'medium', bold: false }
        }
      ],
      footer: {
        footer_type: 'multi_officials',
        signers: [
          {
            role: 'Pemohon',
            name: '{NAMA_PEMOHON}',
            on_behalf_of: null,
            position: 'left',
            show_stamp: false,
            prefix_text: 'Yang Menerangkan',
            nip: null
          },
          {
            role: 'Kepala Desa',
            name: '{KEPALA_DESA_NAMA}',
            on_behalf_of: null,
            position: 'right',
            show_stamp: true,
            prefix_text: 'Mengetahui',
            nip: null
          }
        ],
        location: '{NAMA_DESA}',
        date_format: 'auto',
        custom_note: null
      },
      variables: ['NOMOR_SURAT', 'NAMA_PEWARIS', 'NIK_PEWARIS', 'TEMPAT_LAHIR_PEWARIS', 'TANGGAL_LAHIR_PEWARIS', 'TANGGAL_MENINGGAL', 'ALAMAT_PEWARIS', 'DAFTAR_AHLI_WARIS', 'KEPERLUAN', 'NAMA_PEMOHON'],
      is_active: true
    }
  }
];

interface TemplateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: TemplateData) => void;
}

export function TemplateLibraryDialog({ 
  open, 
  onOpenChange,
  onSelectTemplate
}: TemplateLibraryDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTemplates = presetTemplates.filter(preset => {
    const matchesSearch = 
      preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || preset.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(presetTemplates.map(t => t.category)));

  const handleSelectTemplate = (template: TemplateData) => {
    onSelectTemplate(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Library Template Surat
          </DialogTitle>
          <DialogDescription>
            Pilih template siap pakai untuk memulai pembuatan surat dengan cepat
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filter */}
        <div className="space-y-3 pb-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari template..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Semua
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {filteredTemplates.map((preset) => (
              <Card 
                key={preset.id} 
                className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary"
                onClick={() => handleSelectTemplate(preset.template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="text-4xl">{preset.icon}</div>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {preset.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {preset.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {preset.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {preset.template.variables.length} variabel
                    </span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(preset.template);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Gunakan Template Ini
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada template yang ditemukan</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}