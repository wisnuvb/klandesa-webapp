"use client";

import { useState, useEffect } from "react";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import { motion } from "motion/react";
import { useSession } from "next-auth/react";
import {
  Users,
  TrendingUp,
  Download,
  PieChart,
  Activity,
  Heart,
  MapPin,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  StatisticResidentsModal,
  type StatisticListDimension,
} from "./_components/StatisticResidentsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const COLORS = [
  "#0f766e",
  "#14b8a6",
  "#2dd4bf",
  "#5eead4",
  "#99f6e4",
  "#ccfbf1",
  "#3b82f6",
  "#ec4899",
];

interface StatisticsData {
  summary: {
    totalPenduduk: number;
    lakiLaki: number;
    perempuan: number;
    pertumbuhanBulanIni: number;
    persentasePertumbuhan: number;
  };
  jenisKelamin: Array<{ name: string; value: number; percentage: number }>;
  usia: Array<{
    range: string;
    lakilaki: number;
    perempuan: number;
    total: number;
  }>;
  pendidikan: Array<{ tingkat: string; jumlah: number }>;
  pekerjaan: Array<{ pekerjaan: string; jumlah: number }>;
  perkawinan: Array<{ status: string; jumlah: number }>;
  agama: Array<{ agama: string; jumlah: number }>;
  golonganDarah: Array<{ golongan: string; jumlah: number }>;
  wilayah: Array<{ wilayah: string; jumlah: number }>;
  kesehatan: Array<{ kategori: string; jumlah: number }>;
  trend: Array<{ bulan: string; jumlah: number }>;
}

const STATISTIK_TABS = [
  "overview",
  "usia",
  "gender",
  "pendidikan",
  "pekerjaan",
  "perkawinan",
  "agama",
  "lainnya",
] as const;

export function Statistik() {
  const { data: session } = useSession();
  const villageName =
    session?.user?.village?.name || session?.user?.villageCode || null;
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().getFullYear(),
  );
  const [activeTab, setActiveTab] = usePersistedTab(
    "statistik",
    "overview",
    STATISTIK_TABS,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatisticsData | null>(null);
  const [statisticListModalOpen, setStatisticListModalOpen] = useState(false);
  const [statisticListDimension, setStatisticListDimension] =
    useState<StatisticListDimension | null>(null);
  const [statisticListCategory, setStatisticListCategory] = useState<
    string | null
  >(null);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/statistics?year=${selectedPeriod}`);

      if (!response.ok) {
        throw new Error("Gagal mengambil data statistik");
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      console.error("Error fetching statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Memuat data statistik...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold">Gagal Memuat Data</h3>
          <p className="text-muted-foreground">
            {error || "Data tidak tersedia"}
          </p>
          <Button onClick={fetchStatistics}>Coba Lagi</Button>
        </div>
      </div>
    );
  }

  const {
    summary,
    jenisKelamin,
    usia,
    pendidikan,
    pekerjaan,
    perkawinan,
    agama,
    golonganDarah,
    wilayah,
    kesehatan,
    trend,
  } = data;
  const {
    totalPenduduk,
    lakiLaki,
    perempuan,
    pertumbuhanBulanIni,
    persentasePertumbuhan,
  } = summary;

  const openResidentList = (
    dimension: StatisticListDimension,
    category: string,
  ) => {
    setStatisticListDimension(dimension);
    setStatisticListCategory(category);
    setStatisticListModalOpen(true);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Statistik Kependudukan</h1>
          <p className="text-muted-foreground mt-1">
            Data statistik dan demografi{" "}
            {villageName ? `${villageName}` : "desa Anda"}
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedPeriod.toString()}
            onValueChange={(value) => setSelectedPeriod(Number(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Penduduk
                  </p>
                  <p className="text-3xl font-semibold mt-1">{totalPenduduk}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">
                      +{persentasePertumbuhan}%
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Laki-laki</p>
                  <p className="text-3xl font-semibold mt-1">{lakiLaki}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {((lakiLaki / totalPenduduk) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Perempuan</p>
                  <p className="text-3xl font-semibold mt-1">{perempuan}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {((perempuan / totalPenduduk) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pertumbuhan</p>
                  <p className="text-3xl font-semibold mt-1">
                    +{pertumbuhanBulanIni}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Bulan ini
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs for Different Statistics */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="usia">Usia</TabsTrigger>
              <TabsTrigger value="gender">Gender</TabsTrigger>
              <TabsTrigger value="pendidikan">Pendidikan</TabsTrigger>
              <TabsTrigger value="pekerjaan">Pekerjaan</TabsTrigger>
              <TabsTrigger value="perkawinan">Perkawinan</TabsTrigger>
              <TabsTrigger value="agama">Agama</TabsTrigger>
              <TabsTrigger value="lainnya">Lainnya</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend Kependudukan */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Trend Kependudukan 2024
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trend}>
                        <defs>
                          <linearGradient
                            id="colorJumlah"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#0f766e"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#0f766e"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="bulan" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="jumlah"
                          stroke="#0f766e"
                          fillOpacity={1}
                          fill="url(#colorJumlah)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Distribusi Jenis Kelamin */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-primary" />
                      Distribusi Jenis Kelamin
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={jenisKelamin}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) =>
                            `${name}: ${percentage}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {jenisKelamin.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? "#3b82f6" : "#ec4899"}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Usia Tab */}
            <TabsContent value="usia" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Distribusi Penduduk Berdasarkan Usia</CardTitle>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={usia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="range" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="lakilaki"
                        fill="#3b82f6"
                        name="Laki-laki"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="perempuan"
                        fill="#ec4899"
                        name="Perempuan"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Summary Table */}
                  <div className="mt-6 border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">
                            Rentang Usia
                          </th>
                          <th className="text-right p-3 font-medium">
                            Laki-laki
                          </th>
                          <th className="text-right p-3 font-medium">
                            Perempuan
                          </th>
                          <th className="text-right p-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usia.map((row, index) => (
                          <tr
                            key={index}
                            role="button"
                            tabIndex={0}
                            className="border-t hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() =>
                              openResidentList("age_range", row.range)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openResidentList("age_range", row.range);
                              }
                            }}
                          >
                            <td className="p-3">{row.range} tahun</td>
                            <td className="p-3 text-right">{row.lakilaki}</td>
                            <td className="p-3 text-right">{row.perempuan}</td>
                            <td className="p-3 text-right font-medium">
                              {row.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted font-semibold">
                        <tr>
                          <td className="p-3">Total</td>
                          <td className="p-3 text-right">{lakiLaki}</td>
                          <td className="p-3 text-right">{perempuan}</td>
                          <td className="p-3 text-right">{totalPenduduk}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gender Tab */}
            <TabsContent value="gender" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Perbandingan Jenis Kelamin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <RePieChart>
                        <Pie
                          data={jenisKelamin}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value, percentage }) =>
                            `${name}: ${value} (${percentage}%)`
                          }
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {jenisKelamin.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? "#3b82f6" : "#ec4899"}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Detail Data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {jenisKelamin.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        className="group w-full space-y-2 rounded-lg border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => openResidentList("gender", item.name)}
                        aria-label={`Lihat penduduk berjenis kelamin ${item.name}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="font-medium text-primary underline-offset-4 group-hover:underline">
                              {item.name}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                          <span className="text-2xl font-semibold shrink-0">
                            {item.value}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor:
                                index === 0 ? "#3b82f6" : "#ec4899",
                            }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.percentage}% dari total penduduk
                        </p>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pendidikan Tab */}
            <TabsContent value="pendidikan" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Distribusi Penduduk Berdasarkan Pendidikan
                    </CardTitle>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={pendidikan} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" />
                      <YAxis
                        dataKey="tingkat"
                        type="category"
                        stroke="#6b7280"
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar
                        dataKey="jumlah"
                        fill="#0f766e"
                        radius={[0, 4, 4, 0]}
                      >
                        {pendidikan.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {pendidikan.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        className="group rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() =>
                          openResidentList("education", item.tingkat)
                        }
                        aria-label={`Lihat penduduk berdasarkan pendidikan ${item.tingkat}`}
                      >
                        <p className="text-sm text-muted-foreground">
                          {item.tingkat}
                        </p>
                        <p className="text-2xl font-semibold mt-1 text-primary underline-offset-4 group-hover:underline">
                          {item.jumlah}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {((item.jumlah / totalPenduduk) * 100).toFixed(1)}%
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pekerjaan Tab */}
            <TabsContent value="pekerjaan" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Distribusi Penduduk Berdasarkan Pekerjaan
                    </CardTitle>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={pekerjaan}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="pekerjaan"
                        stroke="#6b7280"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar
                        dataKey="jumlah"
                        fill="#0f766e"
                        radius={[4, 4, 0, 0]}
                      >
                        {pekerjaan.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Detailed List */}
                  <div className="mt-6 space-y-3">
                    {pekerjaan.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        className="group flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() =>
                          openResidentList("occupation", item.pekerjaan)
                        }
                        aria-label={`Lihat daftar penduduk berdasarkan pekerjaan ${item.pekerjaan}`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="font-medium text-primary underline-offset-4 group-hover:underline">
                            {item.pekerjaan}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-semibold">
                              {item.jumlah}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {((item.jumlah / totalPenduduk) * 100).toFixed(1)}
                              %
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Perkawinan Tab */}
            <TabsContent value="perkawinan" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Distribusi Penduduk Berdasarkan Status Perkawinan
                    </CardTitle>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <RePieChart>
                        <Pie
                          data={perkawinan}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ status, jumlah }) => `${status}: ${jumlah}`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="jumlah"
                        >
                          {perkawinan.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>

                    <div className="space-y-3">
                      {perkawinan.map((item, index) => (
                        <button
                          key={index}
                          type="button"
                          className="group flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() =>
                            openResidentList("marital_status", item.status)
                          }
                          aria-label={`Lihat penduduk berdasarkan status ${item.status}`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="font-medium text-primary underline-offset-4 group-hover:underline">
                              {item.status}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-semibold">
                              {item.jumlah}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {((item.jumlah / totalPenduduk) * 100).toFixed(1)}
                              %
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agama Tab */}
            <TabsContent value="agama" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Distribusi Penduduk Berdasarkan Agama</CardTitle>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={agama}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="agama" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="jumlah"
                          fill="#0f766e"
                          radius={[4, 4, 0, 0]}
                        >
                          {agama.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="space-y-3">
                      {agama.map((item, index) => (
                        <button
                          key={index}
                          type="button"
                          className="group flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() =>
                            openResidentList("religion", item.agama)
                          }
                          aria-label={`Lihat penduduk berdasarkan agama ${item.agama}`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="font-medium text-primary underline-offset-4 group-hover:underline">
                              {item.agama}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-semibold">
                              {item.jumlah}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {((item.jumlah / totalPenduduk) * 100).toFixed(1)}
                              %
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Lainnya (Wilayah, Golongan Darah, Kesehatan) */}
            <TabsContent value="lainnya" className="mt-6 space-y-6">
              {/* Wilayah/Dusun */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Distribusi Per Wilayah/Dusun
                    </CardTitle>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={wilayah}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="wilayah" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip />
                      <Bar
                        dataKey="jumlah"
                        fill="#0f766e"
                        radius={[4, 4, 0, 0]}
                      >
                        {wilayah.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-6 space-y-3">
                    {wilayah.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        className="group flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => openResidentList("hamlet", item.wilayah)}
                        aria-label={`Lihat penduduk di wilayah ${item.wilayah}`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="font-medium text-primary underline-offset-4 group-hover:underline">
                            {item.wilayah}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold">{item.jumlah}</p>
                          <p className="text-xs text-muted-foreground">
                            {((item.jumlah / totalPenduduk) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Golongan Darah & Kesehatan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribusi Golongan Darah</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {golonganDarah.map((item, index) => (
                        <button
                          key={index}
                          type="button"
                          className="group flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() =>
                            openResidentList("blood_type", item.golongan)
                          }
                          aria-label={`Lihat penduduk golongan darah ${item.golongan}`}
                        >
                          <span className="font-medium text-primary underline-offset-4 group-hover:underline">
                            {item.golongan}
                          </span>
                          <div className="text-right flex items-center gap-2 shrink-0">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-lg font-semibold">
                              {item.jumlah}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (
                              {((item.jumlah / totalPenduduk) * 100).toFixed(1)}
                              %)
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      Data Kesehatan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {kesehatan.map((item, index) => (
                        <button
                          key={index}
                          type="button"
                          className="group flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() =>
                            openResidentList("health", item.kategori)
                          }
                          aria-label={`Lihat penduduk kategori ${item.kategori}`}
                        >
                          <span className="font-medium text-sm text-primary underline-offset-4 group-hover:underline">
                            {item.kategori}
                          </span>
                          <div className="text-right flex items-center gap-2 shrink-0">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-lg font-semibold">
                              {item.jumlah}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (
                              {((item.jumlah / totalPenduduk) * 100).toFixed(1)}
                              %)
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <StatisticResidentsModal
        open={statisticListModalOpen}
        onOpenChange={setStatisticListModalOpen}
        dimension={statisticListDimension}
        categoryLabel={statisticListCategory}
      />
    </div>
  );
}

export default Statistik;
