import {
  X,
  Users,
  MapPin,
  Home,
  Phone,
  Calendar,
  Briefcase,
  GraduationCap,
  Heart,
  Split,
  Eye,
  EyeOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { calculateAge } from "@/utils";
import { SplitHouseholdPanel } from "@/components/app/kependudukan/SplitHouseholdPanel";
import { KkHistory } from "@/components/app/kependudukan/KkHistory";

interface AnggotaKeluarga {
  id: number;
  name: string;
  id_number: string;
  gender: "M" | "F";
  birthplace: string;
  date_of_birth: string;
  religion_id: number;
  education_id: number;
  job_id: number;
  marital_status: string;
  status_family: string;
  is_live: string;
  /** Hidup dan belum tercatat pindah keluar. Kosong (API lama) = ikut `is_live`. */
  is_active?: boolean;
  role: string;
}

interface KartuKeluarga {
  id: string;
  /** Pegangan buram (id salah satu anggota) untuk memanggil API tanpa nomor KK. */
  ref?: number;
  /** Tersamar, kecuali admin sudah menampilkan nomor lengkap. */
  family_card_number: string;
  /** Nomor KK dan NIK sedang ditampilkan lengkap. */
  revealed?: boolean;
  kepalaKeluarga: string;
  alamat: string;
  rt: string;
  rw: string;
  hamlet: string;
  jumlahAnggota: number;
  anggotaKeluarga: AnggotaKeluarga[];
}

interface DetailKKModalProps {
  isOpen: boolean;
  onClose: () => void;
  kkData: KartuKeluarga;
  /** Boleh memecah KK (izin ubah warga). */
  canSplit?: boolean;
  /** Dipanggil setelah KK dipecah, supaya pemanggil memuat ulang detail dan daftar. */
  onChanged?: (info?: { movedIds: number[] }) => void;
  /** Pengguna boleh melihat NIK dan nomor KK lengkap (admin). */
  canReveal?: boolean;
  /** Minta pemanggil memuat ulang detail dengan (true) atau tanpa (false) nomor lengkap. */
  onReveal?: (full: boolean) => void;
}

// Helper functions untuk mapping data
const getEducationLevel = (id: number): string => {
  const educationMap: Record<number, string> = {
    1: "Tidak/Belum Sekolah",
    2: "Belum Tamat SD/Sederajat",
    3: "Tamat SD/Sederajat",
    4: "SLTP/Sederajat",
    5: "SLTA/Sederajat",
    6: "Diploma I/II",
    7: "Akademi/Diploma III/S.Muda",
    8: "Diploma IV/Strata I",
    9: "Strata II",
    10: "Strata III",
  };
  return educationMap[id] || "Tidak Diketahui";
};

const getReligion = (id: number): string => {
  const religionMap: Record<number, string> = {
    1: "Islam",
    2: "Kristen",
    3: "Katolik",
    4: "Hindu",
    5: "Buddha",
    6: "Konghucu",
  };
  return religionMap[id] || "Tidak Diketahui";
};

const getJob = (id: number): string => {
  const jobMap: Record<number, string> = {
    1: "Belum/Tidak Bekerja",
    5: "Petani/Pekebun",
    10: "Buruh Harian Lepas",
    11: "Buruh Tani/Perkebunan",
    15: "Wiraswasta",
    20: "Guru",
    25: "Pegawai Negeri Sipil",
    30: "Pedagang",
    48: "Ibu Rumah Tangga",
    51: "Karyawan Swasta",
  };
  return jobMap[id] || "Lainnya";
};

const getMaritalStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    TM: "Belum Menikah",
    M: "Menikah",
    CH: "Cerai Hidup",
    CM: "Cerai Mati",
  };
  return statusMap[status] || status;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function DetailKKModal({ isOpen, onClose, kkData, canSplit = false, onChanged, canReveal = false, onReveal }: DetailKKModalProps) {
  const splitMembers = kkData.anggotaKeluarga.map((a) => ({
    id: a.id,
    name: a.name,
    nikLast4: a.id_number.slice(-4),
    familyRole: a.status_family,
    active: a.is_active ?? a.is_live === "Y",
  }));
  const canOfferSplit = canSplit && splitMembers.filter((m) => m.active).length >= 2;
  const [splitOpen, setSplitOpen] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  // Dialog sungguhan: fokus pindah ke modal, Escape menutup (kecuali ada daftar pilihan terbuka), fokus kembali ke pemicu.
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => dialogRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("[data-radix-popper-content-wrapper]")) return;
      closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      trigger?.focus?.();
    };
  }, [isOpen]);
  const inactiveCount = kkData.anggotaKeluarga.filter((a) => !(a.is_active ?? a.is_live === "Y")).length;
  const openSplit = () => {
    setSplitOpen(true);
    // Formulir muncul di badan modal; gulirkan ke sana supaya terlihat dari tombol di footer.
    requestAnimationFrame(() => splitRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="kk-detail-title"
              tabIndex={-1}
              onKeyDown={(e) => {
                // Jebakan fokus: Tab berputar di dalam dialog, tidak keluar ke halaman di belakang overlay.
                if (e.key !== "Tab") return;
                const box = dialogRef.current;
                if (!box) return;
                const items = Array.from(
                  box.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [role="combobox"]:not([disabled]), [tabindex]:not([tabindex="-1"])'),
                ).filter((el) => el.offsetParent !== null);
                if (items.length === 0) return;
                const first = items[0];
                const last = items[items.length - 1];
                const active = document.activeElement;
                if (e.shiftKey && (active === first || active === box)) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && active === last) {
                  e.preventDefault();
                  first.focus();
                }
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col outline-none"
            >
              {/* Header */}
              <div className="bg-primary text-primary-foreground p-6 flex items-start justify-between shrink-0">
                <div>
                  <h2 id="kk-detail-title" className="text-2xl font-semibold mb-2">
                    Detail Kartu Keluarga
                  </h2>
                  <p className="text-sm opacity-90">
                    No. KK: {kkData.family_card_number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup"
                  className="text-primary-foreground hover:bg-primary-foreground/10 rounded-lg p-2 transition-colors"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto min-h-0 flex-1">
                {/* Info KK */}
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold mb-4">
                    Informasi Kartu Keluarga
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Kepala Keluarga
                        </p>
                        <p className="font-medium">{kkData.kepalaKeluarga}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Jumlah Anggota
                        </p>
                        <p className="font-medium">
                          {kkData.jumlahAnggota} Orang
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Alamat</p>
                        <p className="font-medium">{kkData.alamat}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Home className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          RT/RW/Dusun
                        </p>
                        <p className="font-medium">
                          RT {kkData.rt} / RW {kkData.rw} - {kkData.hamlet}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pecah KK: formulir dibuka dari tombol di footer; hanya bila ada ≥2 anggota aktif dan peran boleh mengubah warga */}
                {canOfferSplit && splitOpen ? (
                  <div ref={splitRef} className="p-6 border-b">
                    <SplitHouseholdPanel
                      key={splitMembers.map((m) => `${m.id}:${m.familyRole}:${m.active}`).join("|")}
                      defaultOpen
                      allowed={canSplit}
                      household={{ kk: kkData.family_card_number, ref: kkData.ref, members: splitMembers }}
                      onClosed={() => setSplitOpen(false)}
                      onDone={(info) => {
                        setSplitOpen(false);
                        onChanged?.(info);
                      }}
                    />
                  </div>
                ) : null}

                {/* Anggota Keluarga */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Daftar Anggota Keluarga
                  </h3>
                  {inactiveCount > 0 ? (
                    <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                      {kkData.anggotaKeluarga.length - inactiveCount} anggota aktif; {inactiveCount} tercatat meninggal atau sudah pindah.
                    </p>
                  ) : null}
                  <div className="space-y-4">
                    {kkData.anggotaKeluarga.map((anggota, index) => (
                      <motion.div
                        key={anggota.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${(anggota.is_active ?? anggota.is_live === "Y") ? "" : "bg-muted/40"}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-lg font-semibold text-primary">
                                {anggota.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">
                                {anggota.name}
                              </h4>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <Badge
                                  variant={
                                    anggota.status_family === "Kepala Keluarga"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {anggota.status_family}
                                </Badge>
                                <Badge
                                  variant={
                                    anggota.gender === "M"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {anggota.gender === "M"
                                    ? "Laki-laki"
                                    : "Perempuan"}
                                </Badge>
                                {(anggota.is_active ?? anggota.is_live === "Y") ? null : (
                                  <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-900">
                                    {anggota.is_live === "N" ? "Meninggal" : "Sudah pindah"}
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  {calculateAge(anggota.date_of_birth)} Tahun
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                NIK
                              </p>
                              <p className="font-mono">{anggota.id_number}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Tempat, Tanggal Lahir
                              </p>
                              <p>
                                {anggota.birthplace},{" "}
                                {formatDate(anggota.date_of_birth)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Pendidikan
                              </p>
                              <p>{getEducationLevel(anggota.education_id)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Pekerjaan
                              </p>
                              <p>{getJob(anggota.job_id)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Heart className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Status Perkawinan
                              </p>
                              <p>{getMaritalStatus(anggota.marital_status)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Home className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Agama
                              </p>
                              <p>{getReligion(anggota.religion_id)}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Riwayat Buku Mutasi: dimuat hanya saat dibuka */}
                {kkData.ref ? (
                  <div className="p-6 border-t">
                    <KkHistory key={kkData.ref} refId={kkData.ref} />
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="p-6 border-t bg-muted/30 flex flex-wrap items-center justify-end gap-2 shrink-0">
                {canReveal && onReveal ? (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    aria-pressed={Boolean(kkData.revealed)}
                    onClick={() => onReveal(!kkData.revealed)}
                    title={kkData.revealed ? undefined : "Tindakan ini dicatat di jejak audit"}
                  >
                    {kkData.revealed ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                    {kkData.revealed ? "Sembunyikan NIK dan KK" : "Tampilkan NIK dan KK lengkap"}
                  </Button>
                ) : null}
                {canOfferSplit && !splitOpen ? (
                  <Button className="mr-auto min-h-11 gap-2 px-5 font-semibold shadow-sm" onClick={openSplit}>
                    <Split aria-hidden="true" className="h-4 w-4" />
                    Pecah KK
                  </Button>
                ) : null}
                <Button variant="outline" className="min-h-11 px-5" onClick={onClose}>
                  Tutup
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
