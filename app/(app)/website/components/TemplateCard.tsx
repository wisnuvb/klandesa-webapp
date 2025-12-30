import { Eye, ExternalLink, Crown, Check } from "lucide-react";
import Image from "next/image";
import { WebsiteTemplate } from "../types";
import { formatCurrency, getBadgeColor } from "../utils";

interface TemplateCardProps {
  template: WebsiteTemplate;
  onPreview: (template: WebsiteTemplate) => void;
  onChoose: (template: WebsiteTemplate) => void;
}

export function TemplateCard({
  template,
  onPreview,
  onChoose,
}: TemplateCardProps) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 group">
      {/* Template Badge */}
      {template.badge && (
        <div className="absolute top-4 left-4 z-10">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${getBadgeColor(
              template.badge
            )}`}
          >
            {template.badge}
          </span>
        </div>
      )}

      {/* Template Image Preview */}
      <div className="relative h-64 bg-gradient-to-br from-teal-50 to-blue-50 overflow-hidden">
        {template.preview_images && template.preview_images.length > 0 ? (
          <Image
            src={template.preview_images[0]}
            alt={template.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-400 text-lg font-medium">No Preview</div>
          </div>
        )}

        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button
            onClick={() => onPreview(template)}
            className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          {template.demo_url && (
            <a
              href={template.demo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Demo
            </a>
          )}
        </div>
      </div>

      {/* Template Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {template.name}
              {template.is_premium && (
                <Crown className="w-5 h-5 text-amber-500" />
              )}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-teal-600">
            {formatCurrency(template.price)}
          </div>
          <div className="text-sm text-gray-500">per tahun</div>
        </div>

        {/* Features */}
        <div className="space-y-2 mb-4">
          {template.features.slice(0, 4).map((feature, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
          {template.features.length > 4 && (
            <div className="text-sm text-gray-500">
              +{template.features.length - 4} fitur lainnya
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onChoose(template)}
          className="w-full py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
        >
          Pilih Template
        </button>
      </div>
    </div>
  );
}
