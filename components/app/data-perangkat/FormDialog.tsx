import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EDUCATION_OPTIONS } from "@/utils/constants/user";
import { usePermissions } from "@/hooks/use-permissions";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/rbac/labels";
import { VILLAGE_ROLES } from "@/lib/permissions/client";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_ORG_SETTINGS, supervisorCandidates as orgSupervisorCandidates, type OrgSettings } from "@/lib/officials/org";
import { InviteResultDialog, type DeliveryView, type InviteNotice } from "@/components/permissions/InviteResultDialog";
import { AttachmentsSection } from "@/components/app/attachments/AttachmentsSection";
import { useAttachments } from "@/components/app/attachments/useAttachments";

interface FormDialogProps {
  showFormDialog: boolean;
  setShowFormDialog: (value: boolean) => void;
  positions: Position[];
  officials: OfficialOption[];
  /** Pengaturan bagan desa: menentukan atasan yang disarankan untuk Kasi. */
  orgSettings?: OrgSettings;
  onSuccess?: () => void;
}

interface Position {
  id: number;
  name: string;
  level: number;
  unit?: string | null;
}

interface OfficialOption {
  id: number;
  name: string;
  status: string;
  position: Position | null;
}

type FormValues = {
  name: string;
  id_number: string;
  email: string;
  phone_number: string;
  gender: "M" | "F";
  birthplace: string;
  date_of_birth: string;
  address: string;
  village_staff_position_id: string;
  supervisor_id: string;
  education_id: string;
  sk_number: string;
  sk_date: string;
  start_date: string;
  status: "ACTIVE" | "INACTIVE";
  photo?: File | null;
};

export const FormDialog: React.FC<FormDialogProps> = ({
  showFormDialog,
  setShowFormDialog,
  positions,
  officials,
  orgSettings = DEFAULT_ORG_SETTINGS,
  onSuccess,
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Akun login (opsional, khusus Admin): dibuat bersamaan dengan data perangkat.
  const { can } = usePermissions();
  const canCreateAccount = can("rbac", "create");
  const [makeAccount, setMakeAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountRole, setAccountRole] = useState("staff");
  const [notice, setNotice] = useState<InviteNotice | null>(null);
  const att = useAttachments("OFFICIAL", null);
  const isLoading = saving || att.flushing;

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      id_number: "",
      email: "",
      phone_number: "",
      gender: "M",
      birthplace: "",
      date_of_birth: "",
      address: "",
      village_staff_position_id: positions[0]?.id?.toString() ?? "",
      supervisor_id: "none",
      education_id: "1",
      sk_number: "",
      sk_date: "",
      start_date: "",
      status: "ACTIVE",
      photo: null,
    },
  });

  useEffect(() => {
    if (!form.getValues("village_staff_position_id") && positions[0]?.id) {
      form.setValue("village_staff_position_id", positions[0].id.toString());
    }
  }, [positions, form]);

  const watchedPositionId = form.watch("village_staff_position_id");
  const supervisorCandidates = useMemo(
    () =>
      orgSupervisorCandidates({
        position: positions.find((position) => position.id.toString() === watchedPositionId),
        officials,
        settings: orgSettings,
      }),
    [watchedPositionId, positions, officials, orgSettings],
  );

  const handlePhotoUpload = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setSaving(true);
      const response = await fetch("/api/officials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          id_number: values.id_number,
          email: values.email,
          phone_number: values.phone_number,
          gender: values.gender,
          birthplace: values.birthplace,
          date_of_birth: values.date_of_birth,
          address: values.address,
          village_staff_position_id: values.village_staff_position_id,
          supervisor_id:
            values.supervisor_id === "none" ? null : Number(values.supervisor_id),
          education_id: values.education_id,
          sk_number: values.sk_number,
          sk_date: values.sk_date,
          start_date: values.start_date,
          status: values.status,
          ...(canCreateAccount && makeAccount
            ? { account: { email: accountEmail || values.email, role: accountRole } }
            : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal menambahkan perangkat desa");
      }

      const created = (await response.json().catch(() => null)) as {
        id?: number;
        name?: string;
        account?: { created: true; email: string; delivery: DeliveryView | null } | { created: false; error: string };
      } | null;
      if (created?.id) await att.flushAndNotify(created.id);

      toast.success("Data perangkat berhasil ditambahkan");
      if (created?.account?.created) {
        if (created.account.delivery) {
          setNotice({ email: created.account.email, name: created.name ?? values.name, kind: "invite", delivery: created.account.delivery });
        }
      } else if (created?.account && !created.account.created) {
        toast.warning(`Perangkat tersimpan, tetapi akun login belum dibuat: ${created.account.error} Buat dari menu Akses Pengguna.`);
      }
      setMakeAccount(false);
      setAccountEmail("");
      setAccountRole("staff");
      setShowFormDialog(false);
      form.reset({
        name: "",
        id_number: "",
        email: "",
        phone_number: "",
        gender: "M",
        birthplace: "",
        date_of_birth: "",
        address: "",
        village_staff_position_id: positions[0]?.id?.toString() ?? "",
        supervisor_id: "none",
        education_id: "1",
        sk_number: "",
        sk_date: "",
        start_date: "",
        status: "ACTIVE",
        photo: null,
      });
      setPhotoPreview(null);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tambah Perangkat Desa</DialogTitle>
          <DialogDescription>
            Masukkan detail perangkat desa baru.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="overflow-y-auto flex-1 px-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Nama wajib diisi" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nama</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Lengkap" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_number"
                rules={{ required: "NIK wajib diisi" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>NIK</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nomor Induk Kependudukan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Alamat Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>No. Telepon</FormLabel>
                    <FormControl>
                      <Input placeholder="Nomor Telepon" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                rules={{ required: "Jenis kelamin wajib dipilih" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Jenis Kelamin</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Jenis Kelamin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Laki-laki</SelectItem>
                          <SelectItem value="F">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthplace"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tempat Lahir</FormLabel>
                    <FormControl>
                      <Input placeholder="Tempat Lahir" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                rules={{ required: "Tanggal lahir wajib diisi" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Alamat Lengkap" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="village_staff_position_id"
                rules={{ required: "Jabatan wajib dipilih" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Jabatan</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Jabatan" />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.length > 0 ? (
                            positions.map((position) => (
                              <SelectItem
                                key={position.id}
                                value={position.id.toString()}
                              >
                                {position.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-positions" disabled>
                              Tidak ada jabatan tersedia
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supervisor_id"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Atasan Langsung (Opsional)</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Atasan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tidak Ada</SelectItem>
                          {supervisorCandidates.length > 0 ? (
                            supervisorCandidates.map((official) => (
                              <SelectItem
                                key={official.id}
                                value={official.id.toString()}
                              >
                                {`${official.name} - ${official.position?.name ?? "Tanpa Jabatan"}`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-supervisor" disabled>
                              Belum ada kandidat atasan
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="education_id"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Pendidikan</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Pendidikan" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EDUCATION_OPTIONS).map(
                            ([id, name]) => (
                              <SelectItem key={id} value={name}>
                                {name}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sk_number"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nomor SK</FormLabel>
                    <FormControl>
                      <Input placeholder="Nomor Surat Keputusan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sk_date"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tanggal SK</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tanggal Mulai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Aktif</SelectItem>
                          <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Foto</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          field.onChange(file);
                          handlePhotoUpload(file);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {photoPreview && (
                      <div className="mt-2">
                        <Image
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-40 object-cover rounded-md"
                          width={160}
                          height={160}
                        />
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {canCreateAccount && (
              <fieldset className="mt-4 space-y-3 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">Akun login (opsional)</legend>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <label htmlFor="official-make-account" className="text-sm font-medium">
                      Buat akun login untuk perangkat ini
                    </label>
                    <p className="text-xs text-muted-foreground">Kami mengirim email berisi tautan agar yang bersangkutan membuat kata sandinya sendiri. Bisa dilewati dan dibuat nanti di menu Akses Pengguna.</p>
                  </div>
                  <Switch id="official-make-account" checked={makeAccount} onCheckedChange={setMakeAccount} />
                </div>
                {makeAccount && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="official-account-email" className="text-sm font-medium">
                        Email untuk masuk
                      </label>
                      <Input
                        id="official-account-email"
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                        placeholder={form.watch("email") || "nama@contoh.id"}
                        aria-describedby="official-account-email-help"
                      />
                      <p id="official-account-email-help" className="text-xs text-muted-foreground">
                        Undangan dikirim ke sini; harus email aktif milik orangnya. Kosongkan untuk memakai email di atas. Harus unik.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="official-account-role" className="text-sm font-medium">
                        Peran awal
                      </label>
                      <Select value={accountRole} onValueChange={setAccountRole}>
                        <SelectTrigger id="official-account-role" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VILLAGE_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[accountRole as keyof typeof ROLE_DESCRIPTIONS]}</p>
                    </div>
                  </div>
                )}
              </fieldset>
            )}

            <div className="mt-4">
              <AttachmentsSection att={att} title="Berkas SK pengangkatan" hint="Unggah salinan SK pengangkatan (PDF atau pindaian). Disimpan di Arsip Digital." />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFormDialog(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    <InviteResultDialog notice={notice} onClose={() => setNotice(null)} />
    </>
  );
};
