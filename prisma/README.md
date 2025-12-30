# Klandesa Database Schema Documentation

## Overview

Database schema untuk aplikasi Klandesa - Sistem manajemen desa berbasis multi-tenant yang lengkap. Schema ini dirancang untuk mendukung banyak desa dalam satu instance dengan isolasi data yang kuat.

## Tech Stack

- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Features**: JSONB for flexibility, Full-text search, Audit logging

## Quick Start

### 1. Setup Database

```bash
# Install dependencies
npm install

# Setup PostgreSQL database
createdb klandesa_dev

# Set environment variable
echo "DATABASE_URL=postgresql://user:password@localhost:5432/klandesa_dev" > .env
```

### 2. Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Or run manual SQL migration
psql klandesa_dev < prisma/migrations/00001_initial_schema.sql
```

### 3. Seed Data (Optional)

```bash
npx prisma db seed
```

## Architecture

### Multi-Tenant Design

```
Village (Tenant Root)
├── Users
├── Residents
├── Officials
├── Mail Services
├── Transactions
├── Budgets
└── ... (all features)
```

**Key Points:**
- ✅ Every table has `village_id` foreign key
- ✅ All queries MUST filter by `village_id`
- ✅ Cascade delete on village removal
- ✅ Row-level security can be implemented

## Schema Structure

### 1. Core System

#### `villages`
Root table untuk multi-tenant. Setiap desa = 1 tenant.

**Key Fields:**
- `code`: Unique village code
- `subscription_plan`: free, basic, premium
- `storage_limit` & `storage_used`: Quota management
- `settings`: JSONB for flexible configuration

#### `users`
Admin, staff, dan perangkat desa yang bisa login.

**Roles:**
- `admin`: Full access
- `staff`: Limited access
- `village_head`: Kepala desa
- `secretary`: Sekretaris desa

### 2. Data Warga (Residents)

#### `residents`
Data penduduk desa lengkap.

**Features:**
- ✅ NIK unique per village
- ✅ Full-text search on name
- ✅ Soft delete (is_alive, move_date, death_date)
- ✅ Family tracking via KK number

**Important Indexes:**
```sql
CREATE INDEX idx_residents_name_trgm ON residents USING gin(name gin_trgm_ops);
```
Enables fuzzy search: `SELECT * WHERE name ILIKE '%ahmad%'`

### 3. Data Perangkat (Officials)

#### `positions` + `officials`
Struktur organisasi perangkat desa.

**Design:**
- `positions`: Template jabatan (Kepala Desa, Sekretaris, dll)
- `officials`: Orang yang memegang jabatan

**Benefit:**
- ✅ Historical tracking (start_date, end_date)
- ✅ Multiple people can hold same position over time
- ✅ Salary & allowance per position

### 4. Layanan Surat (Mail Services)

#### `mail_templates`
Template surat yang reusable.

```json
{
  "variables": ["NAMA", "NIK", "TEMPAT_LAHIR", ...],
  "required_fields": ["NAMA", "NIK"],
  "header_id": 1,
  "footer_id": 1
}
```

**Global vs Custom:**
- `is_global = true`: Template tersedia untuk semua desa
- `village_id = NULL`: Global template
- `village_id = X`: Custom template untuk desa tertentu

#### `mail_services`
Surat yang sudah dibuat dari template.

**Hybrid Approach:**

**Normalized Columns** (for fast query):
- `letter_number`: Nomor surat (unique, indexed)
- `applicant_name`: Nama pemohon (indexed)
- `applicant_nik`: NIK pemohon (indexed)
- `letter_date`: Tanggal surat
- `status`: draft, completed, archived

**JSONB Column** (for flexibility):
```json
{
  "NOMOR_SURAT": "475/039/424.304.2.02/2024",
  "NAMA": "Ahmad Lutfi Akbar",
  "NIK": "3201010101850001",
  "TEMPAT_LAHIR": "Pasuruan",
  "TANGGAL_LAHIR": "01 Januari 1985",
  "JENIS_KELAMIN": "Laki-laki",
  "JENIS_USAHA": "Warung Kelontong",
  "KEPERLUAN": "Mengajukan kredit UMKM"
}
```

**Why This Design?**
✅ Fast search by name/NIK (normalized columns)
✅ Flexible fields per template (JSONB)
✅ No schema migration when adding new templates
✅ Can query inside JSON: `form_data->>'JENIS_USAHA'`

**Important Index:**
```sql
CREATE INDEX idx_mail_services_form_data 
ON mail_services USING gin(form_data jsonb_path_ops);
```

### 5. Keuangan (Financial)

#### `budgets`
Anggaran per kategori per tahun.

**Auto-calculated Fields:**
- `remaining_amount = budget_amount - realized_amount`
- `realization_percent = (realized_amount / budget_amount) * 100`

Handled by database trigger!

#### `transactions`
Transaksi pendapatan & pengeluaran.

**Link to Budget:**
- Each transaction can reference a `budget_id`
- Updating transaction updates budget realization

### 6. Potensi Desa (Potentials)

Katalog potensi desa (pertanian, peternakan, UMKM, wisata).

**Flexible Fields:**
- `production_value` + `production_unit`: e.g., 100 ton
- `annual_income`: Estimated income
- `involved_people`: Berapa orang terlibat
- `images`: JSONB array of image URLs

### 7. Arsip Digital (Digital Archives)

File management system.

**Features:**
- ✅ Category & tags for organization
- ✅ Access control (public, staff, admin)
- ✅ Download tracking
- ✅ Storage quota tracking

**Storage Integration:**
- `file_path`: Could be S3, Supabase Storage, or local
- Update `villages.storage_used` on upload/delete

### 8. Statistik (Statistics)

Pre-calculated statistics per month/year.

**Why Separate Table?**
- ✅ Faster dashboard loading
- ✅ Historical tracking
- ✅ Can recalculate from raw data if needed

**Update Strategy:**
- Run monthly cron job
- Or materialized view with refresh schedule

## Query Examples

### Multi-tenant Safety

```typescript
// ❌ WRONG - Missing village_id
const residents = await prisma.resident.findMany();

// ✅ CORRECT - Always filter by village_id
const residents = await prisma.resident.findMany({
  where: { villageId: currentVillageId }
});
```

### Search Residents

```typescript
// Fuzzy name search
const results = await prisma.$queryRaw`
  SELECT * FROM residents 
  WHERE village_id = ${villageId}
    AND name ILIKE ${'%' + query + '%'}
  ORDER BY name
  LIMIT 20
`;
```

### Mail Service with Template

```typescript
const mailService = await prisma.mailService.create({
  data: {
    villageId: 1,
    templateId: 1,
    templateName: "Surat Keterangan Usaha",
    templateCategory: "Keterangan",
    letterNumber: "475/039/2024",
    letterDate: new Date(),
    applicantName: "Ahmad Lutfi",
    applicantNik: "3201010101850001",
    signerRole: "kepala_desa",
    formData: {
      NAMA: "Ahmad Lutfi Akbar",
      NIK: "3201010101850001",
      TEMPAT_LAHIR: "Pasuruan",
      TANGGAL_LAHIR: "01 Januari 1985",
      JENIS_USAHA: "Warung Kelontong",
      KEPERLUAN: "Kredit UMKM"
    },
    status: "draft"
  }
});
```

### Query JSON Field

```typescript
// Find all mail services with specific business type
const results = await prisma.$queryRaw`
  SELECT * FROM mail_services
  WHERE village_id = ${villageId}
    AND form_data->>'JENIS_USAHA' = 'Warung Kelontong'
`;

// Or using Prisma JSON filter
const results = await prisma.mailService.findMany({
  where: {
    villageId,
    formData: {
      path: ['JENIS_USAHA'],
      equals: 'Warung Kelontong'
    }
  }
});
```

### Budget Calculation

```typescript
// Create budget
const budget = await prisma.budget.create({
  data: {
    villageId: 1,
    budgetCode: "5.1.1",
    year: 2024,
    category: "Belanja Pegawai",
    budgetAmount: 500000000,
    description: "Belanja pegawai tahun 2024",
    createdBy: userId
  }
});
// remaining_amount and realization_percent auto-calculated by trigger!

// Add transaction linked to budget
await prisma.transaction.create({
  data: {
    villageId: 1,
    budgetId: budget.id,
    transactionNumber: "TR-001/2024",
    transactionDate: new Date(),
    type: "expense",
    category: "Belanja Pegawai",
    description: "Gaji bulan Januari",
    amount: 50000000,
    status: "verified"
  }
});

// Update budget realization
await prisma.budget.update({
  where: { id: budget.id },
  data: {
    realizedAmount: {
      increment: 50000000
    }
  }
});
// Trigger will auto-update remaining_amount and realization_percent
```

### Statistics Generation

```typescript
async function generateMonthlyStatistics(villageId: number, year: number, month: number) {
  // Count residents
  const totalPopulation = await prisma.resident.count({
    where: { villageId, isAlive: true }
  });
  
  const malePopulation = await prisma.resident.count({
    where: { villageId, isAlive: true, gender: 'Laki-laki' }
  });
  
  // Financial stats
  const income = await prisma.transaction.aggregate({
    where: {
      villageId,
      type: 'income',
      transactionDate: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1)
      }
    },
    _sum: { amount: true }
  });
  
  // Save statistics
  await prisma.statistic.upsert({
    where: {
      villageId_year_month: { villageId, year, month }
    },
    create: {
      villageId,
      year,
      month,
      totalPopulation,
      malePopulation,
      femalePopulation: totalPopulation - malePopulation,
      totalIncome: income._sum.amount || 0
    },
    update: {
      totalPopulation,
      malePopulation,
      totalIncome: income._sum.amount || 0
    }
  });
}
```

## Performance Tips

### 1. Always Use Indexes

```sql
-- Already created in migration:
idx_residents_village_name
idx_mail_services_village_date
idx_transactions_village_date
```

### 2. Use Pagination

```typescript
const residents = await prisma.resident.findMany({
  where: { villageId },
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { name: 'asc' }
});
```

### 3. Select Only Needed Fields

```typescript
// ❌ Fetches all fields including large JSON
const mail = await prisma.mailService.findMany();

// ✅ Select only what you need
const mail = await prisma.mailService.findMany({
  select: {
    id: true,
    letterNumber: true,
    applicantName: true,
    status: true
  }
});
```

### 4. Use Transactions for Related Operations

```typescript
await prisma.$transaction(async (tx) => {
  const transaction = await tx.transaction.create({
    data: { ... }
  });
  
  await tx.budget.update({
    where: { id: budgetId },
    data: {
      realizedAmount: { increment: transaction.amount }
    }
  });
});
```

## Backup & Maintenance

### Backup

```bash
# Full backup
pg_dump klandesa_prod > backup_$(date +%Y%m%d).sql

# Backup specific village (multi-tenant)
pg_dump -t villages -t residents -t officials \
  --where="village_id=1" klandesa_prod > village_1_backup.sql
```

### Vacuum & Analyze

```sql
-- Run monthly
VACUUM ANALYZE;

-- Specific tables with high churn
VACUUM ANALYZE mail_services;
VACUUM ANALYZE transactions;
```

## Security Considerations

### 1. Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their village's data
CREATE POLICY residents_isolation ON residents
  USING (village_id = current_setting('app.current_village_id')::int);
```

### 2. API Layer

Always validate `village_id` from JWT token:

```typescript
// Middleware to set village context
app.use((req, res, next) => {
  const { villageId } = req.user; // from JWT
  req.villageId = villageId;
  next();
});

// In API handlers
app.get('/residents', async (req, res) => {
  const residents = await prisma.resident.findMany({
    where: { villageId: req.villageId } // ✅ Enforced
  });
  res.json(residents);
});
```

## Scaling Strategies

### 1. Partitioning (for large deployments)

```sql
-- Partition mail_services by village_id
CREATE TABLE mail_services_partitioned (LIKE mail_services)
PARTITION BY LIST (village_id);

-- Create partition per village (or group of villages)
CREATE TABLE mail_services_village_1 
PARTITION OF mail_services_partitioned FOR VALUES IN (1);
```

### 2. Read Replicas

- Master: Writes
- Replica: Reads (dashboard, reports)

```typescript
// Using Prisma with read replicas
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // Master
    }
  }
});

const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_READ_URL // Replica
    }
  }
});
```

### 3. Caching

- Cache frequently accessed data (village settings, statistics)
- Use Redis for session & hot data
- Materialize complex queries

## Migration Guide

### Adding New Field

```bash
# Edit schema.prisma
# Then:
npx prisma migrate dev --name add_resident_blood_type
```

### Changing Existing Field

```sql
-- Create migration file manually
-- migrations/00002_modify_resident_nik.sql

ALTER TABLE residents 
ALTER COLUMN nik TYPE VARCHAR(20);
```

## Support

For questions or issues:
- 📧 Email: dev@klandesa.com
- 📚 Docs: https://docs.klandesa.com
- 💬 Discord: https://discord.gg/klandesa

---

**Last Updated**: December 2024
**Schema Version**: 1.0.0
