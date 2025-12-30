"use client";

import { FullPageStatus } from "@/components/PageStatus";
import { useRouter } from "next/navigation";

// import { useState } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   Package,
//   Tag,
//   Plus,
//   Search,
//   Filter,
//   Edit,
//   Trash2,
//   X,
//   Upload,
//   ShoppingBag,
//   TrendingUp,
//   DollarSign,
//   ChevronDown,
//   Image as ImageIcon,
//   Eye,
//   Percent,
// } from "lucide-react";

// // Types
// interface ProductImage {
//   md: string;
//   sm: string;
// }

// interface Product {
//   id: number;
//   village_id: number;
//   name: string;
//   description: string;
//   price: number;
//   discount_price: number;
//   images: ProductImage[];
//   category_id: number;
//   user_id: number;
//   created_by: number;
//   created_at: string;
//   updated_at: string;
// }

// interface ProductCategory {
//   id: number;
//   village_id: number;
//   name: string;
//   slug: string;
//   created_at: string;
//   updated_at: string;
// }

// // Mock Data
// const mockCategories: ProductCategory[] = [
//   {
//     id: 1,
//     village_id: 1,
//     name: "Makanan & Minuman",
//     slug: "makanan-minuman",
//     created_at: "2024-10-12 23:37:58",
//     updated_at: "2024-10-12 23:37:58",
//   },
//   {
//     id: 2,
//     village_id: 1,
//     name: "Kerajinan Tangan",
//     slug: "kerajinan-tangan",
//     created_at: "2024-10-12 23:37:58",
//     updated_at: "2024-10-12 23:37:58",
//   },
//   {
//     id: 3,
//     village_id: 1,
//     name: "Kerajinan Bambu",
//     slug: "kerajinan-bambu",
//     created_at: "2024-10-12 23:37:58",
//     updated_at: "2024-10-12 23:37:58",
//   },
//   {
//     id: 4,
//     village_id: 1,
//     name: "Produk Pertanian",
//     slug: "produk-pertanian",
//     created_at: "2024-10-12 23:37:58",
//     updated_at: "2024-10-12 23:37:58",
//   },
// ];

// const mockProducts: Product[] = [
//   {
//     id: 1,
//     village_id: 1,
//     name: "Kerupuk Udang Premium",
//     description:
//       "Kerupuk udang adalah kerupuk yang terbuat dari udang pilihan dengan kualitas terbaik. Renyah dan gurih.",
//     price: 15000,
//     discount_price: 12000,
//     images: [
//       {
//         md: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=500&h=500&fit=crop",
//         sm: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=200&h=200&fit=crop",
//       },
//       {
//         md: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=500&h=500&fit=crop",
//         sm: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=200&h=200&fit=crop",
//       },
//     ],
//     category_id: 1,
//     user_id: 6875,
//     created_by: 1,
//     created_at: "2024-10-12 13:18:07",
//     updated_at: "2024-10-12 23:03:09",
//   },
//   {
//     id: 2,
//     village_id: 1,
//     name: "Tas Anyaman Bambu",
//     description:
//       "Tas cantik dari anyaman bambu berkualitas dengan desain modern dan tradisional.",
//     price: 75000,
//     discount_price: 0,
//     images: [
//       {
//         md: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&h=500&fit=crop",
//         sm: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=200&h=200&fit=crop",
//       },
//     ],
//     category_id: 3,
//     user_id: 6875,
//     created_by: 1,
//     created_at: "2024-10-15 10:20:15",
//     updated_at: "2024-10-15 10:20:15",
//   },
//   {
//     id: 3,
//     village_id: 1,
//     name: "Kopi Arabica Lokal",
//     description:
//       "Kopi arabica hasil panen petani lokal dengan cita rasa khas daerah.",
//     price: 45000,
//     discount_price: 40000,
//     images: [
//       {
//         md: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&h=500&fit=crop",
//         sm: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&h=200&fit=crop",
//       },
//     ],
//     category_id: 1,
//     user_id: 6875,
//     created_by: 1,
//     created_at: "2024-10-16 14:30:22",
//     updated_at: "2024-10-16 14:30:22",
//   },
//   {
//     id: 4,
//     village_id: 1,
//     name: "Madu Hutan Asli",
//     description: "Madu murni dari hutan lokal, tanpa campuran dan pengawet.",
//     price: 85000,
//     discount_price: 0,
//     images: [
//       {
//         md: "https://images.unsplash.com/photo-1587049352846-4a222e784dd4?w=500&h=500&fit=crop",
//         sm: "https://images.unsplash.com/photo-1587049352846-4a222e784dd4?w=200&h=200&fit=crop",
//       },
//     ],
//     category_id: 4,
//     user_id: 6875,
//     created_by: 1,
//     created_at: "2024-10-17 09:15:33",
//     updated_at: "2024-10-17 09:15:33",
//   },
//   {
//     id: 5,
//     village_id: 1,
//     name: "Kerajinan Topeng Kayu",
//     description:
//       "Topeng kayu ukiran tangan dengan detail sempurna untuk dekorasi.",
//     price: 125000,
//     discount_price: 110000,
//     images: [
//       {
//         md: "https://images.unsplash.com/photo-1582747652673-603191058a51?w=500&h=500&fit=crop",
//         sm: "https://images.unsplash.com/photo-1582747652673-603191058a51?w=200&h=200&fit=crop",
//       },
//     ],
//     category_id: 2,
//     user_id: 6875,
//     created_by: 1,
//     created_at: "2024-10-18 11:45:40",
//     updated_at: "2024-10-18 11:45:40",
//   },
//   {
//     id: 6,
//     village_id: 1,
//     name: "Emping Melinjo",
//     description:
//       "Emping melinjo renyah dan gurih, cocok sebagai camilan atau pelengkap makanan.",
//     price: 25000,
//     discount_price: 0,
//     images: [
//       {
//         md: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=500&h=500&fit=crop",
//         sm: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=200&h=200&fit=crop",
//       },
//     ],
//     category_id: 1,
//     user_id: 6875,
//     created_by: 1,
//     created_at: "2024-10-19 08:20:15",
//     updated_at: "2024-10-19 08:20:15",
//   },
// ];

// export function ProdukUKM() {
//   const [activeTab, setActiveTab] = useState<"products" | "categories">(
//     "products"
//   );
//   const [products, setProducts] = useState<Product[]>(mockProducts);
//   const [categories, setCategories] =
//     useState<ProductCategory[]>(mockCategories);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterCategory, setFilterCategory] = useState<number | "ALL">("ALL");
//   const [showProductModal, setShowProductModal] = useState(false);
//   const [showCategoryModal, setShowCategoryModal] = useState(false);
//   const [editingProduct, setEditingProduct] = useState<Product | null>(null);
//   const [editingCategory, setEditingCategory] =
//     useState<ProductCategory | null>(null);
//   const [showImagePreview, setShowImagePreview] = useState(false);
//   const [previewImages, setPreviewImages] = useState<ProductImage[]>([]);
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);

//   // Product Form State
//   const [productForm, setProductForm] = useState({
//     name: "",
//     description: "",
//     price: 0,
//     discount_price: 0,
//     category_id: 0,
//     user_id: 6875,
//     images: [] as ProductImage[],
//   });

//   // Category Form State
//   const [categoryForm, setCategoryForm] = useState({
//     name: "",
//     slug: "",
//   });

//   // Statistics
//   const stats = {
//     totalProducts: products.length,
//     totalCategories: categories.length,
//     activeProducts: products.length,
//     totalValue: products.reduce(
//       (acc, p) => acc + (p.discount_price || p.price),
//       0
//     ),
//   };

//   // Format currency
//   const formatCurrency = (amount: number): string => {
//     return new Intl.NumberFormat("id-ID", {
//       style: "currency",
//       currency: "IDR",
//       minimumFractionDigits: 0,
//     }).format(amount);
//   };

//   // Generate slug from name
//   const generateSlug = (name: string): string => {
//     return name
//       .toLowerCase()
//       .replace(/[^\w\s-]/g, "")
//       .replace(/\s+/g, "-")
//       .replace(/--+/g, "-")
//       .trim();
//   };

//   // Filter products
//   const filteredProducts = products.filter((product) => {
//     const matchSearch =
//       product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       product.description.toLowerCase().includes(searchQuery.toLowerCase());
//     const matchCategory =
//       filterCategory === "ALL" || product.category_id === filterCategory;
//     return matchSearch && matchCategory;
//   });

//   // Get category name
//   const getCategoryName = (categoryId: number): string => {
//     const category = categories.find((c) => c.id === categoryId);
//     return category ? category.name : "Tanpa Kategori";
//   };

//   // Count products per category
//   const countProductsByCategory = (categoryId: number): number => {
//     return products.filter((p) => p.category_id === categoryId).length;
//   };

//   // Handle add product
//   const handleAddProduct = () => {
//     setEditingProduct(null);
//     setProductForm({
//       name: "",
//       description: "",
//       price: 0,
//       discount_price: 0,
//       category_id: categories[0]?.id || 0,
//       user_id: 6875,
//       images: [],
//     });
//     setShowProductModal(true);
//   };

//   // Handle edit product
//   const handleEditProduct = (product: Product) => {
//     setEditingProduct(product);
//     setProductForm({
//       name: product.name,
//       description: product.description,
//       price: product.price,
//       discount_price: product.discount_price,
//       category_id: product.category_id,
//       user_id: product.user_id,
//       images: product.images,
//     });
//     setShowProductModal(true);
//   };

//   // Handle save product
//   const handleSaveProduct = () => {
//     if (editingProduct) {
//       setProducts(
//         products.map((p) =>
//           p.id === editingProduct.id
//             ? {
//                 ...p,
//                 ...productForm,
//                 updated_at: new Date().toISOString(),
//               }
//             : p
//         )
//       );
//     } else {
//       const newProduct: Product = {
//         id: products.length + 1,
//         village_id: 1,
//         ...productForm,
//         created_by: 1,
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),
//       };
//       setProducts([...products, newProduct]);
//     }
//     setShowProductModal(false);
//   };

//   // Handle delete product
//   const handleDeleteProduct = (id: number) => {
//     if (confirm("Hapus produk ini?")) {
//       setProducts(products.filter((p) => p.id !== id));
//     }
//   };

//   // Handle add category
//   const handleAddCategory = () => {
//     setEditingCategory(null);
//     setCategoryForm({
//       name: "",
//       slug: "",
//     });
//     setShowCategoryModal(true);
//   };

//   // Handle edit category
//   const handleEditCategory = (category: ProductCategory) => {
//     setEditingCategory(category);
//     setCategoryForm({
//       name: category.name,
//       slug: category.slug,
//     });
//     setShowCategoryModal(true);
//   };

//   // Handle save category
//   const handleSaveCategory = () => {
//     if (editingCategory) {
//       setCategories(
//         categories.map((c) =>
//           c.id === editingCategory.id
//             ? {
//                 ...c,
//                 ...categoryForm,
//                 updated_at: new Date().toISOString(),
//               }
//             : c
//         )
//       );
//     } else {
//       const newCategory: ProductCategory = {
//         id: categories.length + 1,
//         village_id: 1,
//         ...categoryForm,
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),
//       };
//       setCategories([...categories, newCategory]);
//     }
//     setShowCategoryModal(false);
//   };

//   // Handle delete category
//   const handleDeleteCategory = (id: number) => {
//     const productsInCategory = countProductsByCategory(id);
//     if (productsInCategory > 0) {
//       alert(
//         `Tidak dapat menghapus kategori ini karena masih ada ${productsInCategory} produk.`
//       );
//       return;
//     }
//     if (confirm("Hapus kategori ini?")) {
//       setCategories(categories.filter((c) => c.id !== id));
//     }
//   };

//   // Handle image preview
//   const handleImagePreview = (images: ProductImage[], index: number = 0) => {
//     setPreviewImages(images);
//     setCurrentImageIndex(index);
//     setShowImagePreview(true);
//   };

//   // Calculate discount percentage
//   const getDiscountPercentage = (
//     price: number,
//     discountPrice: number
//   ): number => {
//     if (!discountPrice || discountPrice >= price) return 0;
//     return Math.round(((price - discountPrice) / price) * 100);
//   };

//   return (
//     <div className="space-y-6">
//       {/* Summary Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.1 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600 mb-1">Total Produk</p>
//               <p className="text-3xl font-bold text-gray-900">
//                 {stats.totalProducts}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//               <Package className="w-6 h-6 text-blue-600" />
//             </div>
//           </div>
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.2 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600 mb-1">Total Kategori</p>
//               <p className="text-3xl font-bold text-gray-900">
//                 {stats.totalCategories}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
//               <Tag className="w-6 h-6 text-purple-600" />
//             </div>
//           </div>
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.3 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600 mb-1">Produk Aktif</p>
//               <p className="text-3xl font-bold text-teal-600">
//                 {stats.activeProducts}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
//               <ShoppingBag className="w-6 h-6 text-teal-600" />
//             </div>
//           </div>
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.4 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600 mb-1">Nilai Total</p>
//               <p className="text-2xl font-bold text-green-600">
//                 {formatCurrency(stats.totalValue)}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
//               <DollarSign className="w-6 h-6 text-green-600" />
//             </div>
//           </div>
//         </motion.div>
//       </div>

//       {/* Main Content Card */}
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.5 }}
//         className="bg-white rounded-xl shadow-sm border border-gray-200"
//       >
//         {/* Tabs */}
//         <div className="border-b border-gray-200">
//           <div className="flex gap-1 p-1">
//             <button
//               onClick={() => setActiveTab("products")}
//               className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
//                 activeTab === "products"
//                   ? "bg-teal-50 text-teal-700"
//                   : "text-gray-600 hover:bg-gray-50"
//               }`}
//             >
//               Daftar Produk
//             </button>
//             <button
//               onClick={() => setActiveTab("categories")}
//               className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
//                 activeTab === "categories"
//                   ? "bg-teal-50 text-teal-700"
//                   : "text-gray-600 hover:bg-gray-50"
//               }`}
//             >
//               Kategori Produk
//             </button>
//           </div>
//         </div>

//         {/* Tab Content */}
//         <div className="p-6">
//           {/* Products Tab */}
//           {activeTab === "products" && (
//             <div className="space-y-4">
//               {/* Toolbar */}
//               <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
//                 <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
//                   <div className="flex-1 relative">
//                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                     <input
//                       type="text"
//                       placeholder="Cari produk..."
//                       value={searchQuery}
//                       onChange={(e) => setSearchQuery(e.target.value)}
//                       className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                     />
//                   </div>
//                   <div className="relative">
//                     <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                     <select
//                       value={filterCategory}
//                       onChange={(e) =>
//                         setFilterCategory(
//                           e.target.value === "ALL"
//                             ? "ALL"
//                             : parseInt(e.target.value)
//                         )
//                       }
//                       className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
//                     >
//                       <option value="ALL">Semua Kategori</option>
//                       {categories.map((cat) => (
//                         <option key={cat.id} value={cat.id}>
//                           {cat.name}
//                         </option>
//                       ))}
//                     </select>
//                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
//                   </div>
//                 </div>
//                 <button
//                   onClick={handleAddProduct}
//                   className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
//                 >
//                   <Plus className="w-4 h-4" />
//                   Tambah Produk
//                 </button>
//               </div>

//               {/* Products Grid */}
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//                 {filteredProducts.map((product) => {
//                   const discount = getDiscountPercentage(
//                     product.price,
//                     product.discount_price
//                   );
//                   return (
//                     <motion.div
//                       key={product.id}
//                       initial={{ opacity: 0, scale: 0.95 }}
//                       animate={{ opacity: 1, scale: 1 }}
//                       className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
//                     >
//                       {/* Product Image */}
//                       <div className="relative aspect-square bg-gray-100 overflow-hidden">
//                         {product.images.length > 0 ? (
//                           <>
//                             <img
//                               src={product.images[0].md}
//                               alt={product.name}
//                               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
//                             />
//                             {product.images.length > 1 && (
//                               <button
//                                 onClick={() =>
//                                   handleImagePreview(product.images, 0)
//                                 }
//                                 className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 rounded-lg hover:bg-opacity-100 transition-all opacity-0 group-hover:opacity-100"
//                               >
//                                 <Eye className="w-4 h-4 text-gray-700" />
//                               </button>
//                             )}
//                           </>
//                         ) : (
//                           <div className="w-full h-full flex items-center justify-center">
//                             <ImageIcon className="w-12 h-12 text-gray-400" />
//                           </div>
//                         )}
//                         {discount > 0 && (
//                           <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1">
//                             <Percent className="w-3 h-3" />
//                             {discount}%
//                           </div>
//                         )}
//                         <div className="absolute bottom-2 left-2">
//                           <span className="inline-block px-2 py-1 bg-teal-500 text-white text-xs rounded-lg">
//                             {getCategoryName(product.category_id)}
//                           </span>
//                         </div>
//                       </div>

//                       {/* Product Info */}
//                       <div className="p-4">
//                         <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
//                           {product.name}
//                         </h3>
//                         <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[2.5rem]">
//                           {product.description}
//                         </p>
//                         <div className="mb-4">
//                           {product.discount_price > 0 ? (
//                             <div className="flex items-baseline gap-2">
//                               <span className="text-lg font-bold text-teal-600">
//                                 {formatCurrency(product.discount_price)}
//                               </span>
//                               <span className="text-sm text-gray-500 line-through">
//                                 {formatCurrency(product.price)}
//                               </span>
//                             </div>
//                           ) : (
//                             <span className="text-lg font-bold text-gray-900">
//                               {formatCurrency(product.price)}
//                             </span>
//                           )}
//                         </div>
//                         <div className="flex items-center gap-2">
//                           <button
//                             onClick={() => handleEditProduct(product)}
//                             className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
//                           >
//                             <Edit className="w-4 h-4" />
//                             Edit
//                           </button>
//                           <button
//                             onClick={() => handleDeleteProduct(product.id)}
//                             className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
//                           >
//                             <Trash2 className="w-4 h-4" />
//                           </button>
//                         </div>
//                       </div>
//                     </motion.div>
//                   );
//                 })}
//               </div>

//               {filteredProducts.length === 0 && (
//                 <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
//                   <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                   <p className="text-gray-500">Tidak ada produk</p>
//                   <p className="text-sm text-gray-400 mt-1">
//                     Tambah produk baru untuk memulai
//                   </p>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Categories Tab */}
//           {activeTab === "categories" && (
//             <div className="space-y-4">
//               <div className="flex justify-between items-center">
//                 <h3 className="font-medium text-gray-900">
//                   Daftar Kategori Produk
//                 </h3>
//                 <button
//                   onClick={handleAddCategory}
//                   className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
//                 >
//                   <Plus className="w-4 h-4" />
//                   Tambah Kategori
//                 </button>
//               </div>

//               <div className="overflow-x-auto">
//                 <table className="w-full">
//                   <thead>
//                     <tr className="border-b border-gray-200">
//                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Nama Kategori
//                       </th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Slug
//                       </th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Jumlah Produk
//                       </th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Dibuat
//                       </th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Aksi
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-200">
//                     {categories.map((category) => (
//                       <motion.tr
//                         key={category.id}
//                         initial={{ opacity: 0 }}
//                         animate={{ opacity: 1 }}
//                         className="hover:bg-gray-50 transition-colors"
//                       >
//                         <td className="px-4 py-4">
//                           <div className="flex items-center gap-3">
//                             <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
//                               <Tag className="w-5 h-5 text-teal-600" />
//                             </div>
//                             <span className="font-medium text-gray-900">
//                               {category.name}
//                             </span>
//                           </div>
//                         </td>
//                         <td className="px-4 py-4 text-sm text-gray-600">
//                           <code className="px-2 py-1 bg-gray-100 rounded text-xs">
//                             {category.slug}
//                           </code>
//                         </td>
//                         <td className="px-4 py-4">
//                           <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
//                             {countProductsByCategory(category.id)} produk
//                           </span>
//                         </td>
//                         <td className="px-4 py-4 text-sm text-gray-600">
//                           {new Date(category.created_at).toLocaleDateString(
//                             "id-ID",
//                             {
//                               day: "numeric",
//                               month: "short",
//                               year: "numeric",
//                             }
//                           )}
//                         </td>
//                         <td className="px-4 py-4">
//                           <div className="flex items-center gap-2">
//                             <button
//                               onClick={() => handleEditCategory(category)}
//                               className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
//                               title="Edit"
//                             >
//                               <Edit className="w-4 h-4" />
//                             </button>
//                             <button
//                               onClick={() => handleDeleteCategory(category.id)}
//                               className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
//                               title="Hapus"
//                             >
//                               <Trash2 className="w-4 h-4" />
//                             </button>
//                           </div>
//                         </td>
//                       </motion.tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               {categories.length === 0 && (
//                 <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
//                   <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                   <p className="text-gray-500">Belum ada kategori</p>
//                   <p className="text-sm text-gray-400 mt-1">
//                     Tambah kategori untuk mengelompokkan produk
//                   </p>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </motion.div>

//       {/* Product Modal */}
//       <AnimatePresence>
//         {showProductModal && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
//             onClick={() => setShowProductModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8"
//             >
//               <div className="px-6 py-4 border-b border-gray-200">
//                 <h3 className="text-lg font-semibold text-gray-900">
//                   {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
//                 </h3>
//               </div>

//               <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Nama Produk *
//                   </label>
//                   <input
//                     type="text"
//                     value={productForm.name}
//                     onChange={(e) =>
//                       setProductForm({ ...productForm, name: e.target.value })
//                     }
//                     placeholder="Contoh: Kerupuk Udang Premium"
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Deskripsi *
//                   </label>
//                   <textarea
//                     value={productForm.description}
//                     onChange={(e) =>
//                       setProductForm({
//                         ...productForm,
//                         description: e.target.value,
//                       })
//                     }
//                     placeholder="Deskripsikan produk Anda..."
//                     rows={4}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
//                   />
//                 </div>

//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Harga Normal (Rp) *
//                     </label>
//                     <input
//                       type="number"
//                       value={productForm.price}
//                       onChange={(e) =>
//                         setProductForm({
//                           ...productForm,
//                           price: parseInt(e.target.value) || 0,
//                         })
//                       }
//                       min="0"
//                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Harga Diskon (Rp)
//                     </label>
//                     <input
//                       type="number"
//                       value={productForm.discount_price}
//                       onChange={(e) =>
//                         setProductForm({
//                           ...productForm,
//                           discount_price: parseInt(e.target.value) || 0,
//                         })
//                       }
//                       min="0"
//                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                     />
//                     <p className="text-xs text-gray-500 mt-1">
//                       Kosongkan jika tidak ada diskon
//                     </p>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Kategori *
//                   </label>
//                   <select
//                     value={productForm.category_id}
//                     onChange={(e) =>
//                       setProductForm({
//                         ...productForm,
//                         category_id: parseInt(e.target.value),
//                       })
//                     }
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                   >
//                     <option value={0}>Pilih Kategori</option>
//                     {categories.map((cat) => (
//                       <option key={cat.id} value={cat.id}>
//                         {cat.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Gambar Produk
//                   </label>
//                   <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors cursor-pointer">
//                     <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
//                     <p className="text-sm text-gray-600 mb-1">
//                       Upload gambar produk
//                     </p>
//                     <p className="text-xs text-gray-500">
//                       PNG, JPG hingga 2MB (multiple files)
//                     </p>
//                     <button className="mt-3 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors">
//                       Pilih Gambar
//                     </button>
//                   </div>
//                   {productForm.images.length > 0 && (
//                     <div className="mt-3 grid grid-cols-4 gap-2">
//                       {productForm.images.map((img, index) => (
//                         <div
//                           key={index}
//                           className="relative aspect-square rounded-lg overflow-hidden border border-gray-200"
//                         >
//                           <img
//                             src={img.sm}
//                             alt={`Preview ${index + 1}`}
//                             className="w-full h-full object-cover"
//                           />
//                           <button
//                             onClick={() =>
//                               setProductForm({
//                                 ...productForm,
//                                 images: productForm.images.filter(
//                                   (_, i) => i !== index
//                                 ),
//                               })
//                             }
//                             className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
//                           >
//                             <X className="w-3 h-3" />
//                           </button>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               </div>

//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
//                 <button
//                   onClick={() => setShowProductModal(false)}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   Batal
//                 </button>
//                 <button
//                   onClick={handleSaveProduct}
//                   disabled={
//                     !productForm.name ||
//                     !productForm.description ||
//                     productForm.price === 0 ||
//                     productForm.category_id === 0
//                   }
//                   className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {editingProduct ? "Update" : "Simpan"}
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Category Modal */}
//       <AnimatePresence>
//         {showCategoryModal && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowCategoryModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-md w-full"
//             >
//               <div className="px-6 py-4 border-b border-gray-200">
//                 <h3 className="text-lg font-semibold text-gray-900">
//                   {editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
//                 </h3>
//               </div>

//               <div className="px-6 py-4 space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Nama Kategori *
//                   </label>
//                   <input
//                     type="text"
//                     value={categoryForm.name}
//                     onChange={(e) => {
//                       const name = e.target.value;
//                       setCategoryForm({
//                         name,
//                         slug: generateSlug(name),
//                       });
//                     }}
//                     placeholder="Contoh: Makanan & Minuman"
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Slug *
//                   </label>
//                   <input
//                     type="text"
//                     value={categoryForm.slug}
//                     onChange={(e) =>
//                       setCategoryForm({ ...categoryForm, slug: e.target.value })
//                     }
//                     placeholder="makanan-minuman"
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                   />
//                   <p className="text-xs text-gray-500 mt-1">
//                     Slug akan di-generate otomatis dari nama
//                   </p>
//                 </div>
//               </div>

//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
//                 <button
//                   onClick={() => setShowCategoryModal(false)}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   Batal
//                 </button>
//                 <button
//                   onClick={handleSaveCategory}
//                   disabled={!categoryForm.name || !categoryForm.slug}
//                   className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {editingCategory ? "Update" : "Simpan"}
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Image Preview Modal */}
//       <AnimatePresence>
//         {showImagePreview && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowImagePreview(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="relative max-w-4xl w-full"
//             >
//               <button
//                 onClick={() => setShowImagePreview(false)}
//                 className="absolute -top-12 right-0 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
//               >
//                 <X className="w-6 h-6" />
//               </button>

//               <div className="bg-white rounded-xl overflow-hidden">
//                 <img
//                   src={previewImages[currentImageIndex]?.md}
//                   alt="Preview"
//                   className="w-full h-auto"
//                 />
//                 {previewImages.length > 1 && (
//                   <div className="p-4 flex items-center justify-center gap-2">
//                     {previewImages.map((_, index) => (
//                       <button
//                         key={index}
//                         onClick={() => setCurrentImageIndex(index)}
//                         className={`w-3 h-3 rounded-full transition-colors ${
//                           index === currentImageIndex
//                             ? "bg-teal-600"
//                             : "bg-gray-300"
//                         }`}
//                       />
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// export default ProdukUKM;

const UKMPage = () => {
  const router = useRouter();
  return (
    <FullPageStatus
      type="development"
      title="Halaman UKM Sedang Dikembangkan"
      message="Kami sedang mengerjakan fitur UKM. Nantikan pembaruan selanjutnya!"
      action={{
        label: "Kembali ke Dashboard",
        onClick: () => router.push("/dashboard"),
      }}
    >
      <div className="text-sm text-yellow-800 max-w-md mx-auto">
        <p>
          Fitur UKM akan membantu pelaku usaha mikro, kecil, dan menengah di
          desa.
        </p>
      </div>
    </FullPageStatus>
  );
};

export default UKMPage;
