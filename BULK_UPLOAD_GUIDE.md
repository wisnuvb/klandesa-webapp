# Bulk Upload Residents via Excel - Implementation Summary

## Overview
Implemented complete bulk upload feature for residents via Excel with validation, editing capabilities, and batch processing.

## Features Implemented

### 1. **API Endpoint** (`/api/residents/bulk`)
- **Location**: `app/api/residents/bulk/route.ts`
- **Method**: POST
- **Max Batch Size**: 500 residents per upload
- **Features**:
  - Session-based village resolution
  - Full data validation before bulk insert
  - Duplicate NIK detection (within batch and database)
  - Transaction-safe bulk insert with Prisma
  - Optional user account creation per resident
  - Detailed error reporting for invalid rows

### 2. **Validation Rules**
Required fields:
- `name` - Must not be empty
- `id_number` (NIK) - Must be 16 digits
- `birthplace` - Must not be empty
- `date_of_birth` - Must be valid date (YYYY-MM-DD)
- `gender` - Must be 'M' or 'F'
- `address` - Must not be empty

Validation checks:
- ✅ Field presence validation
- ✅ NIK format (16 digits)
- ✅ Date format validation
- ✅ Gender enum validation
- ✅ Duplicate NIK detection in batch
- ✅ Existing NIK checking in database

### 3. **Frontend UI** (`ExcelUploadDialog`)
Enhanced with:
- **Editable Table Preview**: All fields can be edited before upload
- **Row-by-row error display**: Shows validation errors with red highlighting
- **Row removal**: Delete rows from batch with one click
- **Max size warning**: Shows error if file exceeds 500 rows
- **Status indicators**: ✓ (green) for valid rows, ✕ (red) for invalid
- **Loading state**: Spinner during submission
- **Error handling**: Detailed error messages and recovery

### 4. **Data Mapping**
Proper field mapping from Excel to Prisma model:
```
id_number → nik
family_card_number → kk
name → name
birthplace → birthplace
date_of_birth → birthDate
gender → gender
blood_type_id → bloodType
religion_id → religion (parsed via parseReligion)
marital_status → maritalStatus (parsed via getMaritalStatus)
status_family_id → familyRole (parsed via parseFamilyRole)
job_id → occupation (parsed via parseJob)
education_id → education (parsed via parseEducation)
address → address
rt → rt
rw → rw
hamlet → hamlet
```

**Important**: The bulk import now supports **both formats**:
- **Numeric IDs**: e.g., `religion_id: 1` (legacy format)
- **String values**: e.g., `religion_id: "Islam"` (new format from Excel)

Mapping functions automatically detect and convert:
- `parseReligion()` - Handles "Islam", "Kristen", "Katholik", "Hindu", "Budha", "Khonghucu"
- `parseEducation()` - Handles "Tamat SD", "SLTP", "SLTA", "Strata I", etc.
- `parseJob()` - Handles "Wiraswasta", "Petani/Pekebun", "PNS", etc.
- `parseFamilyRole()` - Handles "Kepala Keluarga", "Istri", "Anak", etc.
family_card_number → kk
date_of_birth → birthDate
religion_id → mapReligionId()
status_family_id → mapFamilyRole()
education_id → getEducationLevel()
job_id → getJob()
marital_status → getMaritalStatus()
```

## Limits & Constraints

- **Max batch size**: 500 residents per upload
- **Recommended batch size**: 100-200 for faster processing
- **Field size limits**: Follow Prisma schema (NIK=16, name=255, etc)
- **Transaction safety**: All or nothing - single failure rolls back entire batch

## Error Handling

**API returns validation errors with details:**
```json
{
  "error": "Data tidak valid",
  "invalidRows": [
    {
      "rowNumber": 1,
      "errors": [
        "NIK harus 16 digit",
        "Tanggal lahir harus diisi"
      ]
    }
  ]
}
```

**Frontend displays:**
- Error summary with row numbers
- List of issues per row
- Highlighted invalid rows in red
- Option to edit and retry

## Success Response

```json
{
  "success": true,
  "message": "Berhasil mengupload 50 data warga",
  "data": {
    "residentsCreated": 50,
    "usersCreated": 10
  }
}
```

## Usage Flow

1. Click "Upload via Excel" button
2. Download template to see correct format
3. Fill Excel file with resident data
4. Upload file → auto-preview in table
5. Edit any fields directly in table if needed
6. Remove invalid rows (red highlighted)
7. Click "Upload" to submit to backend
8. Backend validates all data again
9. If valid: bulk insert transaction
10. Success toast shows count of residents added

## Database Constraints

- Unique constraint: `(villageId, nik)` - NIK must be unique per village
- Foreign key: villageId from session
- Cascade delete: If village deleted, residents cascade delete
- Field constraints: See schema.prisma Resident model

## Future Enhancements

- [ ] Progress bar for large batches (500+ rows)
- [ ] Parallel upload with chunking
- [ ] Excel template download with dropdown lists
- [ ] Column mapping customization
- [ ] Duplicate NIK merge/update option
- [ ] Email notification on completion
