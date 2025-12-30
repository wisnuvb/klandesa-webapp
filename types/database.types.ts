/**
 * Database Types - Auto-generated from Prisma Schema
 * This file provides TypeScript types for all database models
 */

// ============================================
// CORE SYSTEM
// ============================================

export interface Village {
  id: number;
  code: string;
  name: string;
  district: string;
  regency: string;
  province: string;
  address: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
  subscriptionPlan: string;
  subscriptionExpiry?: Date;
  storageLimit: number;
  storageUsed: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  villageId: number;
  email: string;
  password: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'admin' | 'staff' | 'village_head' | 'secretary';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// DATA WARGA
// ============================================

export interface Resident {
  id: number;
  villageId: number;
  nik: string;
  kk?: string;
  name: string;
  birthplace: string;
  birthDate: Date;
  gender: 'Laki-laki' | 'Perempuan';
  religion: string;
  maritalStatus: 'Belum Kawin' | 'Kawin' | 'Cerai Hidup' | 'Cerai Mati';
  familyRole: string;
  address: string;
  rt?: string;
  rw?: string;
  hamlet?: string;
  occupation?: string;
  education?: string;
  nationality: string;
  phone?: string;
  email?: string;
  isAlive: boolean;
  moveDate?: Date;
  deathDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ResidentCreateInput = Omit<Resident, 'id' | 'createdAt' | 'updatedAt'>;
export type ResidentUpdateInput = Partial<ResidentCreateInput>;

// ============================================
// DATA PERANGKAT
// ============================================

export interface Position {
  id: number;
  villageId: number;
  name: string;
  level: number;
  salary?: number;
  allowance?: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Official {
  id: number;
  villageId: number;
  positionId: number;
  nik: string;
  name: string;
  birthplace: string;
  birthDate: Date;
  gender: 'Laki-laki' | 'Perempuan';
  phone?: string;
  email?: string;
  address: string;
  startDate: Date;
  endDate?: Date;
  education?: string;
  certification?: string;
  status: 'active' | 'inactive' | 'retired';
  skPengangkatan?: string;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OfficialCreateInput = Omit<Official, 'id' | 'createdAt' | 'updatedAt'>;
export type OfficialUpdateInput = Partial<OfficialCreateInput>;

// ============================================
// PERMOHONAN WARGA
// ============================================

export interface Request {
  id: number;
  villageId: number;
  requestNumber: string;
  category: 'Pengaduan' | 'Permohonan' | 'Informasi';
  title: string;
  description: string;
  requesterNik: string;
  requesterName: string;
  requesterPhone?: string;
  requesterEmail?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  response?: string;
  responseDate?: Date;
  respondedBy?: number;
  attachments?: string[];
  requestDate: Date;
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type RequestCreateInput = Omit<Request, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================
// LAYANAN SURAT
// ============================================

export interface MailTemplate {
  id: number;
  villageId?: number;
  name: string;
  description: string;
  category: string;
  templateStructure: {
    variables: string[];
    required_fields: string[];
    header_id: number;
    footer_id: number;
  };
  contentTemplate: string;
  isActive: boolean;
  isGlobal: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailService {
  id: number;
  villageId: number;
  templateId: number;
  templateName: string;
  templateCategory: string;
  letterNumber: string;
  letterDate: Date;
  applicantName: string;
  applicantNik: string;
  signerRole?: 'kepala_desa' | 'sekretaris' | 'camat';
  signerName?: string;
  formData: Record<string, string>;
  contentHtml?: string;
  status: 'draft' | 'completed' | 'archived' | 'cancelled';
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  printedAt?: Date;
  printCount: number;
}

export type MailServiceCreateInput = Omit<MailService, 'id' | 'createdAt' | 'updatedAt' | 'printCount'>;
export type MailServiceUpdateInput = Partial<MailServiceCreateInput>;

export interface MailHistory {
  id: number;
  mailServiceId: number;
  action: 'created' | 'updated' | 'completed' | 'printed' | 'cancelled';
  changes?: Record<string, any>;
  changedBy?: number;
  changedAt: Date;
}

export interface MailAttachment {
  id: number;
  mailServiceId: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

// ============================================
// PELAYANAN SURAT
// ============================================

export interface MailRequest {
  id: number;
  villageId: number;
  requestNumber: string;
  nik: string;
  name: string;
  mailType: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  rejectionReason?: string;
  requestDate: Date;
  processedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// KEUANGAN
// ============================================

export interface Transaction {
  id: number;
  villageId: number;
  transactionNumber: string;
  transactionDate: Date;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  budgetId?: number;
  paymentMethod?: string;
  referenceNumber?: string;
  receiptUrl?: string;
  attachments?: string[];
  status: 'pending' | 'verified' | 'approved' | 'rejected';
  verifiedBy?: number;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionCreateInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================
// ANGGARAN
// ============================================

export interface Budget {
  id: number;
  villageId: number;
  budgetCode: string;
  year: number;
  category: string;
  subCategory?: string;
  budgetAmount: number;
  realizedAmount: number;
  remainingAmount: number;
  realizationPercent: number;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export type BudgetCreateInput = Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'realizedAmount' | 'remainingAmount' | 'realizationPercent'>;
export type BudgetUpdateInput = Partial<BudgetCreateInput>;

// ============================================
// POTENSI DESA
// ============================================

export interface Potential {
  id: number;
  villageId: number;
  category: string;
  subCategory?: string;
  name: string;
  description: string;
  location?: string;
  area?: number;
  productionValue?: number;
  productionUnit?: string;
  annualIncome?: number;
  involvedPeople?: number;
  images?: string[];
  status: 'active' | 'inactive' | 'potential';
  createdAt: Date;
  updatedAt: Date;
}

export type PotentialCreateInput = Omit<Potential, 'id' | 'createdAt' | 'updatedAt'>;
export type PotentialUpdateInput = Partial<PotentialCreateInput>;

// ============================================
// ARSIP DIGITAL
// ============================================

export interface DigitalArchive {
  id: number;
  villageId: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  category: string;
  subCategory?: string;
  year?: number;
  title: string;
  description?: string;
  tags?: string[];
  isPublic: boolean;
  accessLevel: 'admin' | 'staff' | 'public';
  uploadedBy: number;
  uploadedAt: Date;
  downloadCount: number;
  lastAccessed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DigitalArchiveCreateInput = Omit<DigitalArchive, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount'>;

// ============================================
// STATISTIK
// ============================================

export interface Statistic {
  id: number;
  villageId: number;
  year: number;
  month?: number;
  totalPopulation?: number;
  malePopulation?: number;
  femalePopulation?: number;
  familyCount?: number;
  ageGroup0_4?: number;
  ageGroup5_14?: number;
  ageGroup15_24?: number;
  ageGroup25_54?: number;
  ageGroup55Plus?: number;
  educationSD?: number;
  educationSMP?: number;
  educationSMA?: number;
  educationDiploma?: number;
  educationS1Plus?: number;
  occupationFarmer?: number;
  occupationMerchant?: number;
  occupationEmployee?: number;
  occupationOther?: number;
  religionIslam?: number;
  religionKristen?: number;
  religionKatolik?: number;
  religionHindu?: number;
  religionBuddha?: number;
  religionKonghucu?: number;
  totalMailServices?: number;
  totalRequests?: number;
  completedRequests?: number;
  totalIncome?: number;
  totalExpense?: number;
  additionalData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PORTAL WARGA
// ============================================

export interface Announcement {
  id: number;
  villageId: number;
  title: string;
  content: string;
  category: 'Pengumuman' | 'Berita' | 'Event';
  imageUrl?: string;
  isPinned: boolean;
  priority: number;
  publishDate: Date;
  expiryDate?: Date;
  isActive: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// WEBSITE TEMPLATES
// ============================================

export interface WebsiteTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  previewImage: string;
  thumbnailUrl: string;
  demoUrl?: string;
  structure: Record<string, any>;
  price: number;
  subscriptionType: 'yearly' | 'lifetime';
  usageCount: number;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebsiteSubscription {
  id: number;
  villageId: number;
  templateId: number;
  startDate: Date;
  expiryDate: Date;
  customization?: Record<string, any>;
  customDomain?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// AUDIT LOG
// ============================================

export interface AuditLog {
  id: number;
  villageId?: number;
  userId?: number;
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================
// UTILITY TYPES
// ============================================

export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateInput<T> = Partial<CreateInput<T>>;

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
