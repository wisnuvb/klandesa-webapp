// Website Management Types

export interface WebsiteTemplate {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  features: string[];
  preview_images: string[];
  badge?: "Popular" | "Recommended" | "Best Seller";
  demo_url?: string;
  is_premium?: boolean;
}

export interface ActiveWebsite {
  id: number;
  template_id: number;
  template_name: string;
  domain: string;
  custom_domain?: string;
  is_active: boolean;
  activated_at: string;
  expires_at: string;
  total_visitors: number;
  visitors_today: number;
  visitors_month: number;
  total_posts: number;
  preview_image: string;
  subscription_status: "active" | "expiring_soon" | "expired";
}

export interface ContentTypeConfig {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  isCore: boolean;
  color: string;
}

export interface ContentItem {
  id: number;
  title: string;
  content?: string;
  image_url?: string;
  date?: string;
  status: "published" | "draft";
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = "bank" | "ewallet";
export type StatsRange = "24h" | "7d" | "30d" | "90d";
