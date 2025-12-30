# Testing Guide - Village Potentials & Related Endpoints

## Overview
Dokumentasi lengkap untuk testing Foreign Key relationships, API endpoints, dan seed data.

## Setup

### 1. Reset Database dan Seed Test Data
```bash
# Reset database dan apply migrations
npm run db:reset

# Atau run seed data secara manual setelah reset
npm run db:seed
```

**Data yang akan dibuat:**
- 1 Village: `DESA001` - Desa Ujicoba
- 1 Admin User: admin@test.id
- 5 Positions (Jabatan):
  - Kepala Desa (Level 1)
  - Sekretaris Desa (Level 2)
  - Bendahara Desa (Level 2)
  - Kepala Urusan Umum (Level 3)
  - Kepala Dusun (Level 4)
- 3 Officials (Perangkat Desa)
- 3 Village Potentials (untuk tahun 2022, 2023, 2024)

### 2. Verify Foreign Keys
```bash
npm run db:verify-fk
```

Output akan menampilkan:
- Jumlah records di setiap tabel
- Status FK relationships
- Warning jika ada broken references

## Testing API Endpoints

### Method 1: Menggunakan Script (Recommended)
```bash
# Start dev server terlebih dahulu
npm run dev

# Di terminal lain, run API tests
npm run test:api
```

### Method 2: Manual Testing dengan cURL

#### GET All Village Potentials
```bash
curl -X GET "http://localhost:3000/api/village-potentials?page=1&pageSize=10" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json"
```

#### GET with Year Filter
```bash
curl -X GET "http://localhost:3000/api/village-potentials?page=1&pageSize=10&year=2024" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json"
```

#### GET with Search
```bash
curl -X GET "http://localhost:3000/api/village-potentials?search=pertanian" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json"
```

#### POST New Village Potential
```bash
curl -X POST "http://localhost:3000/api/village-potentials" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json" \
  -d '{
    "year": "2025",
    "population": 5600,
    "households": 1400,
    "area": 1250,
    "agricultureLand": 460,
    "plantationLand": 330,
    "forestArea": 275,
    "educationFacilities": 8,
    "healthFacilities": 3,
    "tourismSpots": 6,
    "waterResources": "Sungai Bone, 4 Mata Air, 18 Sumur Bor",
    "economicPotential": "Pertanian, Perkebunan, Peternakan, Wisata"
  }'
```

#### DELETE Village Potential
```bash
# Replace {id} dengan ID dari record yang ingin dihapus
curl -X DELETE "http://localhost:3000/api/village-potentials/{id}" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json"
```

#### GET Positions
```bash
curl -X GET "http://localhost:3000/api/positions?page=1&pageSize=10" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json"
```

#### GET Officials
```bash
curl -X GET "http://localhost:3000/api/officials?page=1&pageSize=10" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json"
```

### Method 3: Testing via Postman/Insomnia

1. **Import Collection** (optional):
   - Import file `postman_collection.json` (jika ada)

2. **Set Environment Variable**:
   - `base_url`: `http://localhost:3000`
   - `tenant`: `desa001`

3. **Create Requests**:
   - Untuk setiap endpoint di atas, buat request di Postman/Insomnia
   - Set header: `x-tenant-subdomain: desa001`

## Testing via UI (Browser)

### 1. Data Jabatan (Positions)
- URL: `http://localhost:3000/app/data-jabatan`
- Actions:
  - ✅ View list of positions
  - ✅ Add new position via form dialog
  - ✅ See updated count
  - ❌ Edit (not implemented yet)
  - ✅ Delete position

### 2. Potensi Desa (Village Potentials)
- URL: `http://localhost:3000/app/potensi`
- Actions:
  - ✅ View list with statistics
  - ✅ Filter by year
  - ✅ Search by keyword
  - ✅ View detail (modal)
  - ✅ Add new data via form dialog
  - ✅ Delete data

## Foreign Key Relationships Verified

```
Village (id) 
├── Users (villageId → id)
├── Residents (villageId → id)
├── Officials (villageId → id)
│   └── Position (positionId → id)
├── Positions (villageId → id)
├── VillagePotentials (villageId → id) ⭐ NEW
├── Potentials (villageId → id)
├── Requests (villageId → id)
├── MailTemplates (villageId → id, optional)
├── MailServices (villageId → id)
│   └── MailTemplate (templateId → id)
├── Transactions (villageId → id)
├── Budgets (villageId → id)
│   └── BudgetDetails (budgetId → id)
├── DigitalArchives (villageId → id)
└── Announcements (villageId → id)

Users (id)
├── MailServices (createdBy → id)
├── Requests (respondedBy → id)
├── Budgets (createdBy → id)
└── MailHistories (changedBy → id)
```

## Test Cases

### Test Case 1: Create Village Potential
**Purpose**: Verify POST endpoint dengan validation
**Steps**:
1. Call POST `/api/village-potentials` dengan valid data
2. Verify response status 201
3. Verify data appears di database

**Expected Result**: ✅ Data tersimpan dengan benar

### Test Case 2: Duplicate Year Check
**Purpose**: Ensure no duplicate year per village
**Steps**:
1. Try POST dengan year yang sudah ada
2. Verify response status 400
3. Check error message

**Expected Result**: ✅ Error message: "Data for year 2024 already exists"

### Test Case 3: Missing Required Field
**Purpose**: Verify validation
**Steps**:
1. POST tanpa field `population`
2. Verify response status 400

**Expected Result**: ✅ Error message: "Field population is required"

### Test Case 4: Delete Verification
**Purpose**: Verify delete dan cascade
**Steps**:
1. Get list sebelum delete
2. Delete satu record
3. Verify record sudah tidak ada di database

**Expected Result**: ✅ Record dihapus

### Test Case 5: FK Integrity
**Purpose**: Verify semua FK intact
**Steps**:
1. Run `npm run db:verify-fk`
2. Check output

**Expected Result**: ✅ Semua records memiliki valid references

## Troubleshooting

### Error: "Unable to acquire lock"
```bash
# Kill existing next dev process
pkill -f "next dev"
# Atau jika di Windows:
# taskkill /F /IM node.exe
```

### Error: "Database schema is not in sync"
```bash
npm run db:reset
npm run db:seed
```

### API Returns 404 or Empty Response
1. Pastikan dev server running: `npm run dev`
2. Pastikan database seeded: `npm run db:seed`
3. Pastikan header `x-tenant-subdomain: desa001` ada
4. Check console untuk error messages

## Performance Testing

### Load Testing Data Creation
```bash
# Create 100 village potentials untuk testing
for year in {2000..2099}; do
  curl -X POST "http://localhost:3000/api/village-potentials" \
    -H "x-tenant-subdomain: desa001" \
    -H "Content-Type: application/json" \
    -d "{\"year\": \"$year\", ...}"
done
```

## Cleanup

### Delete All Test Data
```bash
npm run db:reset
```

### Rollback Last Migration
```bash
npx prisma migrate resolve --rolled-back add_village_potential_model
```

## Documentation Links

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Foreign Keys in Prisma](https://www.prisma.io/docs/orm/prisma-schema/relations)
