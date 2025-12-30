"use client";

import { useState } from "react";
import { Globe, Plus } from "lucide-react";
import { ActiveWebsite, WebsiteTemplate } from "./types";
import { mockTemplates } from "./data/mockData";
import { SearchBar } from "./components/SearchBar";
import { TemplateCard } from "./components/TemplateCard";
import { StatsCard } from "./components/StatsCard";

// Mock active website (would come from API)
const mockActiveWebsite: ActiveWebsite = {
  id: 1,
  template_id: 1,
  template_name: "Modern Village",
  domain: "desa-brambang.klandesa.id",
  is_active: true,
  activated_at: "2024-01-15",
  expires_at: "2025-01-14",
  total_visitors: 15243,
  visitors_today: 234,
  visitors_month: 4521,
  total_posts: 42,
  preview_image:
    "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop",
  subscription_status: "active",
};

export default function WebsiteDesa() {
  const [isDemoMode] = useState(false);
  const activeWebsite = isDemoMode ? null : mockActiveWebsite;

  const [searchQuery, setSearchQuery] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WebsiteTemplate | null>(null);

  const filteredTemplates = mockTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePreview = (template: WebsiteTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const handleChooseTemplate = (template: WebsiteTemplate) => {
    setSelectedTemplate(template);
    // Open checkout modal
    console.log("Choose template:", template);
  };

  // If user has active website, show dashboard
  if (activeWebsite) {
    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Website Desa
          </h1>
          <p className="text-gray-600">Kelola dan monitor website desa Anda</p>
        </div>

        {/* Website Info Card */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">{activeWebsite.domain}</h2>
                  <p className="text-teal-100">
                    Template: {activeWebsite.template_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-teal-100">
                <span>Status: Aktif</span>
                <span>•</span>
                <span>
                  Berakhir:{" "}
                  {new Date(activeWebsite.expires_at).toLocaleDateString(
                    "id-ID"
                  )}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 bg-white text-teal-600 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                Lihat Website
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Pengunjung"
            value={activeWebsite.total_visitors.toLocaleString()}
            icon="visitors"
            trend={{ value: 12.5, isUp: true }}
          />
          <StatsCard
            title="Pengunjung Hari Ini"
            value={activeWebsite.visitors_today.toLocaleString()}
            icon="views"
            trend={{ value: 8.2, isUp: true }}
          />
          <StatsCard
            title="Pengunjung Bulan Ini"
            value={activeWebsite.visitors_month.toLocaleString()}
            icon="engagement"
            trend={{ value: 15.3, isUp: true }}
          />
          <StatsCard
            title="Total Konten"
            value={activeWebsite.total_posts}
            icon="posts"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <button className="p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-teal-500 hover:bg-teal-50 transition-all text-left group">
            <Plus className="w-8 h-8 text-gray-400 group-hover:text-teal-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Kelola Konten</h3>
            <p className="text-sm text-gray-600">
              Tambah dan edit konten website
            </p>
          </button>

          <button className="p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-teal-500 hover:bg-teal-50 transition-all text-left group">
            <Globe className="w-8 h-8 text-gray-400 group-hover:text-teal-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">
              Lihat Statistik
            </h3>
            <p className="text-sm text-gray-600">Analisis pengunjung website</p>
          </button>

          <button className="p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-teal-500 hover:bg-teal-50 transition-all text-left group">
            <Plus className="w-8 h-8 text-gray-400 group-hover:text-teal-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Ganti Template</h3>
            <p className="text-sm text-gray-600">Ubah tampilan website</p>
          </button>
        </div>
      </div>
    );
  }

  // Template selection view
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Pilih Template Website Desa
        </h1>
        <p className="text-gray-600">
          Pilih template yang sesuai dengan kebutuhan desa Anda
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari template..."
        />
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onPreview={handlePreview}
            onChoose={handleChooseTemplate}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Template tidak ditemukan
          </h3>
          <p className="text-gray-600">
            Coba kata kunci pencarian yang berbeda
          </p>
        </div>
      )}
    </div>
  );
}
