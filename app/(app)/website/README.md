# Website Desa Module - Refactored Structure

## Struktur Folder

```
app/(app)/website/
├── page.tsx                    # Main page (currently 4780 lines - to be replaced)
├── page-new.tsx               # New refactored page (lightweight)
├── types.ts                   # TypeScript types and interfaces
├── utils.ts                   # Utility functions
├── components/                # UI Components
│   ├── SearchBar.tsx
│   ├── TemplateCard.tsx
│   ├── StatsCard.tsx
│   ├── PreviewModal.tsx      # TODO: Extract from old page
│   ├── CheckoutModal.tsx     # TODO: Extract from old page
│   ├── ContentManager.tsx    # TODO: Extract from old page
│   └── StatsModal.tsx        # TODO: Extract from old page
└── data/
    └── mockData.ts           # Mock data (templates, etc)
```

## Komponen yang Sudah Dibuat

### 1. **SearchBar.tsx**
- Reusable search input component
- Props: `value`, `onChange`, `placeholder`

### 2. **TemplateCard.tsx**
- Display template with preview image
- Features list, price, badges
- Actions: Preview, Choose template

### 3. **StatsCard.tsx**
- Statistics display card
- Support for trend indicators
- Multiple icon types

### 4. **page-new.tsx**
- Main page component (cleaned up)
- ~180 lines (vs 4780 lines original)
- Two views: Dashboard (if active website) & Template Selection

## Cara Migrasi

1. **Backup file lama**:
   ```bash
   mv app/(app)/website/page.tsx app/(app)/website/page-old.tsx
   ```

2. **Rename file baru**:
   ```bash
   mv app/(app)/website/page-new.tsx app/(app)/website/page.tsx
   ```

3. **Extract komponen yang tersisa dari page-old.tsx**:
   - PreviewModal (template preview with carousel)
   - CheckoutModal (payment flow)
   - ContentManager (content CRUD operations)
   - StatsModal (detailed analytics)
   - DNSModal (custom domain setup)

## Komponen yang Perlu Dibuat Selanjutnya

### Priority 1 (Core Features)
- [ ] PreviewModal - Template preview dengan image carousel
- [ ] CheckoutModal - Payment selection dan confirmation
- [ ] WebsiteDashboard - Enhanced dashboard dengan charts

### Priority 2 (Content Management)
- [ ] ContentManager - CRUD untuk content (berita, galeri, etc)
- [ ] ContentEditor - Rich text editor form
- [ ] ContentList - List/Grid view untuk content items

### Priority 3 (Analytics & Settings)
- [ ] StatsModal - Detailed analytics dengan charts
- [ ] DNSModal - Custom domain configuration
- [ ] RenewalModal - Subscription renewal flow

## Benefits dari Refactoring

1. **Maintainability**: Setiap komponen punya tanggung jawab tunggal
2. **Reusability**: Komponen bisa dipakai di halaman lain
3. **Testability**: Lebih mudah untuk unit testing
4. **Performance**: Lazy loading per komponen
5. **Collaboration**: Tim bisa kerja parallel di komponen berbeda

## Next Steps

1. Test page-new.tsx untuk memastikan UI dasar bekerja
2. Extract modal-modal dari page-old.tsx
3. Implement missing features satu per satu
4. Delete page-old.tsx setelah semua fitur ter-migrate
