"use client";

import { useState } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Upload, 
  Image as ImageIcon,
  Check,
  FileImage,
  Calendar,
  HardDrive
} from 'lucide-react';
import { useAppDialogs } from '@/components/providers/AppDialogProvider';
import Image from 'next/image';

interface ImageAsset {
  id: string;
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
  type: 'image';
}

interface ImageAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
}

// Mock data untuk digital assets (images only)
const mockImageAssets: ImageAsset[] = [
  {
    id: '1',
    name: 'kantor-desa.jpg',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
    size: '245 KB',
    uploadedAt: '2024-12-15',
    type: 'image'
  },
  {
    id: '2',
    name: 'kegiatan-gotong-royong.jpg',
    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop',
    size: '312 KB',
    uploadedAt: '2024-12-14',
    type: 'image'
  },
  {
    id: '3',
    name: 'panen-padi.jpg',
    url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop',
    size: '428 KB',
    uploadedAt: '2024-12-13',
    type: 'image'
  },
  {
    id: '4',
    name: 'festival-budaya.jpg',
    url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop',
    size: '389 KB',
    uploadedAt: '2024-12-12',
    type: 'image'
  },
  {
    id: '5',
    name: 'produk-umkm.jpg',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
    size: '156 KB',
    uploadedAt: '2024-12-11',
    type: 'image'
  },
  {
    id: '6',
    name: 'wisata-desa.jpg',
    url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop',
    size: '521 KB',
    uploadedAt: '2024-12-10',
    type: 'image'
  },
  {
    id: '7',
    name: 'pembangunan-jalan.jpg',
    url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop',
    size: '287 KB',
    uploadedAt: '2024-12-09',
    type: 'image'
  },
  {
    id: '8',
    name: 'posyandu-balita.jpg',
    url: 'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?w=400&h=300&fit=crop',
    size: '203 KB',
    uploadedAt: '2024-12-08',
    type: 'image'
  }
];

export function ImageAssetModal({ isOpen, onClose, onSelectImage }: ImageAssetModalProps) {
  const { appAlert } = useAppDialogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Filter images based on search
  const filteredImages = mockImageAssets.filter(asset =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectImage = (asset: ImageAsset) => {
    setSelectedImageId(asset.id);
  };

  const handleInsertImage = () => {
    const selectedAsset = mockImageAssets.find(a => a.id === selectedImageId);
    if (selectedAsset) {
      onSelectImage(selectedAsset.url);
      onClose();
      setSelectedImageId(null);
      setSearchQuery('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (uploadFile) {
      // TODO: Implement actual upload to Supabase Storage
      void appAlert({
        title: 'Upload berhasil (demo)',
        description: `Berkas "${uploadFile.name}" terunggah.\n(Fitur ini akan terhubung ke Supabase Storage)`,
      });
      setShowUploadForm(false);
      setUploadFile(null);
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-[100] translate-x-[-50%] translate-y-[-50%] w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl bg-white flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={onClose}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-teal-50 to-teal-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Pilih Gambar</h2>
                <p className="text-xs text-gray-600">Pilih dari aset digital atau upload baru</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search & Upload Bar */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari gambar..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Upload Button */}
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                <Upload className="w-4 h-4" />
                Upload Gambar
              </button>
            </div>

            {/* Upload Form */}
            <AnimatePresence>
              {showUploadForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 p-4 bg-white border-2 border-dashed border-teal-300 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <FileImage className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {uploadFile ? uploadFile.name : 'Pilih file gambar...'}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleUpload}
                      disabled={!uploadFile}
                      className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Upload
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Format yang didukung: JPG, PNG, GIF, WebP (Max 5MB)
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Image Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <ImageIcon className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">Tidak ada gambar ditemukan</p>
                <p className="text-sm">Coba kata kunci lain atau upload gambar baru</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredImages.map((asset) => (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImageId === asset.id
                        ? 'border-teal-600 shadow-lg ring-4 ring-teal-100'
                        : 'border-gray-200 hover:border-teal-400 hover:shadow-md'
                    }`}
                    onClick={() => handleSelectImage(asset)}
                  >
                    {/* Image */}
                    <div className="aspect-4/3 bg-gray-100">
                      <Image
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        width={100}
                        height={100}
                      />
                    </div>

                    {/* Selected Overlay */}
                    {selectedImageId === asset.id && (
                      <div className="absolute inset-0 bg-teal-600/20 flex items-center justify-center">
                        <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-7 h-7 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-white text-xs font-medium truncate mb-1">
                        {asset.name}
                      </p>
                      <div className="flex items-center gap-3 text-white/80 text-xs">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {asset.size}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {asset.uploadedAt}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {selectedImageId ? (
                <span className="text-teal-600 font-medium">
                  1 gambar dipilih
                </span>
              ) : (
                'Pilih gambar untuk melanjutkan'
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleInsertImage}
                disabled={!selectedImageId}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Masukkan Gambar
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
