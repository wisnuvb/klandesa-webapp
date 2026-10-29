"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateAge } from "@/utils";
import { DISABILITY_OPTIONS } from "@/utils/constants/user";
import { Resident } from "@prisma/client";

interface DetailResidentModalProps {
  resident: Resident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FamilyMember = Pick<
  Resident,
  "id" | "name" | "familyRole" | "gender" | "birthDate" | "isAlive"
>;

const formatDate = (value: Date | string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

const formatDateTime = (value: Date | string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatRupiah = (value: number | null | undefined) =>
  value == null ? "-" : `Rp ${value.toLocaleString("id-ID")}`;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold border-b pb-2">{title}</h3>
    {children}
  </div>
);

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className }) => (
  <div className="space-y-1.5">
    <Label className="text-muted-foreground text-xs">{label}</Label>
    <div className={className ?? "text-sm"}>{children}</div>
  </div>
);

const YesNo: React.FC<{ value: boolean | null | undefined }> = ({ value }) => (
  <Badge variant={value ? "default" : "secondary"}>{value ? "Ya" : "Tidak"}</Badge>
);

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
);

export const DetailResidentModal: React.FC<DetailResidentModalProps> = ({
  resident,
  open,
  onOpenChange,
}) => {
  const [familyResult, setFamilyResult] = useState<{
    key: string;
    members: FamilyMember[];
    error: boolean;
  } | null>(null);

  const residentId = resident?.id;
  const kk = resident?.kk;
  const familyKey = open && residentId && kk ? `${residentId}:${kk}` : null;

  useEffect(() => {
    if (!familyKey || !residentId || !kk) return;

    const controller = new AbortController();
    const qs = new URLSearchParams({
      search: kk,
      pageSize: "30",
      sortKey: "birthDate",
      sortOrder: "asc",
    });
    fetch(`/api/residents?${qs.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Gagal memuat anggota KK");
        // `search` juga mencocokkan nama/NIK, jadi saring ulang ke KK yang sama.
        const members = (data.rows as Resident[]).filter(
          (m) => m.kk === kk && m.id !== residentId,
        );
        setFamilyResult({ key: familyKey, members, error: false });
      })
      .catch((err) => {
        if (err?.name !== "AbortError")
          setFamilyResult({ key: familyKey, members: [], error: true });
      });

    return () => controller.abort();
  }, [familyKey, residentId, kk]);

  const current = familyResult?.key === familyKey ? familyResult : null;
  const family = current?.members ?? [];
  const familyError = current?.error ?? false;
  const familyLoading = !!familyKey && !current;

  if (!resident) return null;

  const age = calculateAge(resident.birthDate);
  const isFemale = resident.gender === "Perempuan";
  const disability = resident.disabilityId
    ? (DISABILITY_OPTIONS[String(resident.disabilityId)] ??
      `Kode ${resident.disabilityId}`)
    : null;
  const bmi =
    resident.height && resident.weight
      ? resident.weight / (resident.height / 100) ** 2
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detail Data Warga</DialogTitle>
          <DialogDescription>
            Informasi lengkap data warga yang terdaftar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage
                src={resident.photoThumb || resident.photo || undefined}
                alt={resident.name}
              />
              <AvatarFallback className="text-lg">
                {resident.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-xl font-semibold">{resident.name}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{resident.familyRole}</Badge>
                <Badge variant={resident.isAlive ? "default" : "secondary"}>
                  {resident.isAlive ? "Hidup" : "Meninggal"}
                </Badge>
                {resident.moveDate && <Badge variant="secondary">Pindah</Badge>}
                {resident.isDisability && (
                  <Badge variant="secondary">Disabilitas</Badge>
                )}
                {resident.isStunting && (
                  <Badge variant="secondary">Stunting</Badge>
                )}
              </div>
            </div>
          </div>

          <Section title="Identitas Diri">
            <Grid>
              <Field label="Nama Lengkap" className="font-medium text-base">
                {resident.name}
              </Field>
              <Field label="NIK" className="font-mono text-sm">
                {resident.nik}
              </Field>
              <Field label="No. KK" className="font-mono text-sm">
                {resident.kk || "-"}
              </Field>
              <Field label="Jenis Kelamin">
                <Badge
                  variant={
                    resident.gender === "Laki-laki" ? "default" : "secondary"
                  }
                >
                  {resident.gender}
                </Badge>
              </Field>
              <Field label="Tempat Lahir">{resident.birthplace}</Field>
              <Field label="Tanggal Lahir">
                {formatDate(resident.birthDate)}{" "}
                <span className="text-muted-foreground">({age} Tahun)</span>
              </Field>
              <Field label="Agama">{resident.religion}</Field>
              <Field label="Golongan Darah">{resident.bloodType || "-"}</Field>
              <Field label="Kewarganegaraan">{resident.nationality}</Field>
              <Field label="Kode Negara">{resident.countryCode || "-"}</Field>
            </Grid>
          </Section>

          <Section title="Status & Keluarga">
            <Grid>
              <Field label="Status Perkawinan">{resident.maritalStatus}</Field>
              <Field label="Status Hubungan Dalam KK">
                {resident.familyRole}
              </Field>
            </Grid>
          </Section>

          <Section title="Data Orang Tua">
            <Grid>
              <Field label="Nama Ayah">{resident.fatherName || "-"}</Field>
              <Field label="NIK Ayah" className="font-mono text-sm">
                {resident.fatherNik || "-"}
              </Field>
              <Field label="Nama Ibu">{resident.motherName || "-"}</Field>
              <Field label="NIK Ibu" className="font-mono text-sm">
                {resident.motherNik || "-"}
              </Field>
            </Grid>
          </Section>

          <Section title="Anggota Keluarga Lain">
            {!resident.kk ? (
              <p className="text-sm text-muted-foreground">
                Warga ini belum memiliki No. KK.
              </p>
            ) : familyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : familyError ? (
              <p className="text-sm text-destructive">
                Gagal memuat anggota keluarga.
              </p>
            ) : family.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada anggota keluarga lain dalam KK ini.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {family.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.familyRole} · {m.gender} ·{" "}
                        {calculateAge(m.birthDate)} Tahun
                      </p>
                    </div>
                    {!m.isAlive && <Badge variant="secondary">Meninggal</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Pendidikan & Pekerjaan">
            <Grid>
              <Field label="Pendidikan Terakhir">
                {resident.education || "-"}
              </Field>
              <Field label="Pekerjaan">{resident.occupation || "-"}</Field>
              <Field label="Buta Huruf">
                <YesNo value={resident.isIlliterate} />
              </Field>
            </Grid>
          </Section>

          <Section title="Kesehatan & Sosial">
            <Grid>
              <Field label="Tinggi Badan">
                {resident.height ? `${resident.height} cm` : "-"}
              </Field>
              <Field label="Berat Badan">
                {resident.weight ? `${resident.weight} kg` : "-"}
              </Field>
              {bmi !== null && (
                <Field label="Indeks Massa Tubuh (IMT)">{bmi.toFixed(1)}</Field>
              )}
              <Field label="Peserta BPJS / KIS">
                <YesNo value={resident.isBpjsKis} />
              </Field>
              <Field label="Disabilitas">
                <YesNo value={resident.isDisability} />
              </Field>
              {(resident.isDisability ||
                disability ||
                resident.otherDisability) && (
                <Field label="Jenis Disabilitas">
                  {[disability, resident.otherDisability]
                    .filter(Boolean)
                    .join(" · ") || "-"}
                </Field>
              )}
              <Field label="Stunting">
                <YesNo value={resident.isStunting} />
              </Field>
              {isFemale && (
                <>
                  <Field label="Hamil">
                    <YesNo value={resident.isPregnant} />
                  </Field>
                  {resident.isPregnant && (
                    <Field label="Tanggal Hamil">
                      {formatDate(resident.datePregnant)}
                    </Field>
                  )}
                  <Field label="Menyusui">
                    <YesNo value={resident.isBreastfeeding} />
                  </Field>
                  <Field label="Kontrasepsi">
                    {resident.contraception || "-"}
                  </Field>
                </>
              )}
            </Grid>
          </Section>

          <Section title="Ekonomi & Hunian">
            <Grid>
              <Field label="Penghasilan per Bulan">
                {formatRupiah(resident.income)}
              </Field>
              <Field label="Desil">{resident.desil || "-"}</Field>
              <Field label="Kepemilikan Rumah">
                {resident.houseOwnership || "-"}
              </Field>
            </Grid>
          </Section>

          <Section title="Alamat">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Alamat Lengkap">{resident.address}</Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="RT">{resident.rt || "-"}</Field>
                <Field label="RW">{resident.rw || "-"}</Field>
                <Field label="Dusun">{resident.hamlet || "-"}</Field>
              </div>
              {(resident.tempRt || resident.tempIdNumber) && (
                <Grid>
                  <Field label="RT Sementara">{resident.tempRt || "-"}</Field>
                  <Field label="NIK Sementara" className="font-mono text-sm">
                    {resident.tempIdNumber || "-"}
                  </Field>
                </Grid>
              )}
            </div>
          </Section>

          <Section title="Kontak">
            <Grid>
              <Field label="No. Telepon">{resident.phone || "-"}</Field>
              <Field label="Email">{resident.email || "-"}</Field>
            </Grid>
          </Section>

          <Section title="Status Kependudukan">
            <Grid>
              <Field label="Status">
                <Badge variant={resident.isAlive ? "default" : "secondary"}>
                  {resident.isAlive ? "Hidup" : "Meninggal"}
                </Badge>
              </Field>
              {resident.moveDate && (
                <Field label="Tanggal Pindah">
                  {formatDate(resident.moveDate)}
                </Field>
              )}
              {resident.deathDate && (
                <Field label="Tanggal Meninggal">
                  {formatDate(resident.deathDate)}
                </Field>
              )}
            </Grid>
          </Section>

          <Section title="Informasi Sistem">
            <Grid>
              <Field
                label="Dibuat Pada"
                className="text-xs text-muted-foreground"
              >
                {formatDateTime(resident.createdAt)}
              </Field>
              <Field
                label="Terakhir Diupdate"
                className="text-xs text-muted-foreground"
              >
                {formatDateTime(resident.updatedAt)}
              </Field>
            </Grid>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
