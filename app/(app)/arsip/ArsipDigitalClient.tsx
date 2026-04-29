"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { browsePathFromFolderPath } from "@/lib/digitalArchive/folderPath";
import type {
  ArchiveEntry,
  ArchiveFolderEntry,
  FileItem,
  FileType,
  PaymentMethod,
  StoragePlan,
  ViewMode,
  VillageStorageInfo,
} from "./_types";
import {
  getCurrentPlanFromVillage,
  getPlanDetailById,
} from "./_data/storagePlans";
import { buildVirtualFsItems, calculateFileStats } from "./_utils/fileUtils";
import { StorageSidebar } from "./_components/StorageSidebar";
import { FileManager } from "./_components/FileManager";
import {
  NewFolderModal,
  PaymentModal,
  PreviewModal,
  UpgradeModal,
  UploadModal,
} from "./_components/modals";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";

interface Props {
  initialEntries: ArchiveEntry[];
  initialFolders: ArchiveFolderEntry[];
  villageStorage: VillageStorageInfo;
}

export function ArsipDigitalClient(props: Props) {
  const { initialEntries, initialFolders, villageStorage } = props;
  const { appAlert, appConfirm } = useAppDialogs();

  const [entries, setEntries] = useState<ArchiveEntry[]>(initialEntries);
  const [folders, setFolders] = useState<ArchiveFolderEntry[]>(initialFolders);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [currentPath, setCurrentPath] = useState("/");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FileType | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderCreating, setFolderCreating] = useState(false);

  const [currentPlan, setCurrentPlan] = useState<StoragePlan>(
    getCurrentPlanFromVillage(villageStorage),
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StoragePlan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("QRIS");

  const files = useMemo(() => {
    return buildVirtualFsItems(entries, folders);
  }, [entries, folders]);

  const stats = useMemo(() => calculateFileStats(files), [files]);

  const totalQuotaBytes = villageStorage.storageLimitGb * 1024 * 1024 * 1024;
  const usedBytes = stats.usedBytes;
  const remainingBytes = totalQuotaBytes - usedBytes;
  const usagePercentage =
    totalQuotaBytes > 0 ? (usedBytes / totalQuotaBytes) * 100 : 0;

  const currentPlanDetail = useMemo(
    () => getPlanDetailById(currentPlan),
    [currentPlan],
  );

  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        const matchSearch = file.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchFilter =
          filterType === "ALL" || file.file_type === filterType;
        const matchPath = file.parent_folder === currentPath;
        return matchSearch && matchFilter && matchPath;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "date":
            return (
              new Date(b.modified_at).getTime() -
              new Date(a.modified_at).getTime()
            );
          case "size":
            return b.size - a.size;
          default:
            return 0;
        }
      });
  }, [files, currentPath, filterType, searchQuery, sortBy]);

  const pathSegments = useMemo(
    () => currentPath.split("/").filter(Boolean),
    [currentPath],
  );

  const normBrowse = (p: string) =>
    p.replace(/\/+/g, "/").replace(/\/+$/, "") || "";

  const currentFolder = useMemo(() => {
    const cur = normBrowse(currentPath);
    return (
      folders.find(
        (f) => normBrowse(browsePathFromFolderPath(f.path)) === cur,
      ) ?? null
    );
  }, [currentPath, folders]);

  const uploadDefaults = useMemo(() => {
    if (currentFolder) {
      const segs = currentFolder.path.split("/").filter(Boolean);
      return {
        category: segs[0] || "",
        subCategory: segs.length > 1 ? segs.slice(1).join("/") : null,
        folderId: currentFolder.id as number | null,
      };
    }
    const category = pathSegments[0] || "";
    const subCategory =
      pathSegments.length > 1 ? pathSegments.slice(1).join("/") : null;
    return {
      category,
      subCategory,
      folderId: null as number | null,
    };
  }, [currentFolder, pathSegments]);

  const handleFileClick = (file: FileItem) => {
    if (file.type === "folder") {
      if (file.kind === "folderDb" && file.folderPath) {
        setCurrentPath(browsePathFromFolderPath(file.folderPath));
        return;
      }
      setCurrentPath(`${currentPath}${file.name}/`);
      return;
    }

    setPreviewFile(file);
    setShowPreviewModal(true);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentPath("/");
      return;
    }

    const newPath = "/" + pathSegments.slice(0, index + 1).join("/") + "/";
    setCurrentPath(newPath);
  };

  const toggleFileSelection = (key: string) => {
    if (selectedKeys.includes(key)) {
      setSelectedKeys(selectedKeys.filter((k) => k !== key));
    } else {
      setSelectedKeys([...selectedKeys, key]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedKeys.length === 0) return;
    const okConfirm = await appConfirm({
      title: "Hapus item terpilih?",
      description: `Hapus ${selectedKeys.length} item terpilih? Folder hanya bisa dihapus jika kosong.`,
      confirmLabel: "Hapus",
      tone: "destructive",
    });
    if (!okConfirm) return;

    const archiveIds = selectedKeys
      .filter((k) => k.startsWith("a:"))
      .map((k) => Number(k.slice(2)));
    const folderIds = selectedKeys
      .filter((k) => k.startsWith("f:"))
      .map((k) => Number(k.slice(2)));

    try {
      for (const fid of folderIds) {
        const res = await fetch(`/api/digital-archives/folders/${fid}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || `Gagal hapus folder ${fid}`);
        }
      }
      for (const aid of archiveIds) {
        const res = await fetch(`/api/digital-archives/${aid}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || `Gagal hapus arsip ${aid}`);
        }
      }
      setEntries((prev) => prev.filter((e) => !archiveIds.includes(e.id)));
      setFolders((prev) => prev.filter((f) => !folderIds.includes(f.id)));
      setSelectedKeys([]);
    } catch (e) {
      void appAlert(e instanceof Error ? e.message : "Penghapusan gagal.");
    }
  };

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || folderCreating) return;

    setFolderCreating(true);
    try {
      const res = await fetch("/api/digital-archives/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          parentId: currentFolder?.id ?? null,
        }),
      });
      const data = (await res.json()) as ArchiveFolderEntry & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat folder");
      }
      setFolders((prev) =>
        [
          ...prev,
          {
            id: data.id,
            parentId: data.parentId ?? null,
            name: data.name,
            path: data.path,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          },
        ].sort((a, b) => a.path.localeCompare(b.path)),
      );
      setNewFolderName("");
      setShowNewFolderModal(false);
    } catch (e) {
      void appAlert(e instanceof Error ? e.message : "Gagal membuat folder");
    } finally {
      setFolderCreating(false);
    }
  };

  const handleUpgradePlan = (planId: StoragePlan) => {
    setSelectedPlan(planId);
    setShowUpgradeModal(false);
    setShowPaymentModal(true);
  };

  const handlePayment = () => {
    if (!selectedPlan) return;
    setCurrentPlan(selectedPlan);
    setShowPaymentModal(false);
    setSelectedPlan(null);
    void appAlert({
      title: "Pembayaran berhasil",
      description: "Paket storage Anda telah di-upgrade.",
    });
  };

  const uploadArchive = useCallback(
    async (
      file: File,
      meta: {
        category: string;
        subCategory: string | null;
        title: string;
        isPublic: boolean;
        accessLevel: "admin" | "staff" | "public";
      },
    ): Promise<ArchiveEntry> => {
      const presignRes = await fetch("/api/digital-archives/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size,
          category: meta.category,
          subCategory: meta.subCategory,
          folderId: uploadDefaults.folderId,
        }),
      });

      if (!presignRes.ok) {
        const err = (await presignRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error || "presign_failed");
      }

      const presigned = (await presignRes.json()) as {
        uploadUrl: string;
        fileUrl: string;
        key?: string;
        uploadHeaders?: Record<string, string>;
      };

      const putRes = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: {
          ...(presigned.uploadHeaders || {}),
        },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("upload_failed");
      }

      const createRes = await fetch("/api/digital-archives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          filePath: presigned.fileUrl,
          storageKey: presigned.key ?? null,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size,
          category: meta.category,
          subCategory: meta.subCategory,
          folderId: uploadDefaults.folderId,
          title: meta.title,
          isPublic: meta.isPublic,
          accessLevel: meta.accessLevel,
        }),
      });

      if (!createRes.ok) {
        const err = (await createRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error || "create_failed");
      }

      return (await createRes.json()) as ArchiveEntry;
    },
    [uploadDefaults.folderId],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <StorageSidebar
        currentPlan={currentPlan}
        currentPlanDetail={currentPlanDetail}
        totalQuotaBytes={totalQuotaBytes}
        usedBytes={usedBytes}
        remainingBytes={remainingBytes}
        usagePercentage={usagePercentage}
        fileCount={stats.fileCount}
        fileStats={{
          images: stats.images,
          documents: stats.documents,
          pdfs: stats.pdfs,
          excel: stats.excel,
          archives: stats.archives,
        }}
        onUpgradeClick={() => setShowUpgradeModal(true)}
      />

      <FileManager
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentPath={currentPath}
        pathSegments={pathSegments}
        onBreadcrumbClick={handleBreadcrumbClick}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
        toggleFileSelection={toggleFileSelection}
        onDeleteSelected={handleDeleteSelected}
        onFileClick={handleFileClick}
        filteredFiles={filteredFiles}
        usedBytes={usedBytes}
        usagePercentage={usagePercentage}
        fileCount={stats.fileCount}
        onClickNewFolder={() => setShowNewFolderModal(true)}
        onClickUpload={() => setShowUploadModal(true)}
        onPreview={(file) => {
          setPreviewFile(file);
          setShowPreviewModal(true);
        }}
      />

      <AnimatePresence>
        <UpgradeModal
          open={showUpgradeModal}
          currentPlan={currentPlan}
          onClose={() => setShowUpgradeModal(false)}
          onUpgradePlan={handleUpgradePlan}
        />
      </AnimatePresence>

      <AnimatePresence>
        <PaymentModal
          open={showPaymentModal}
          selectedPlan={selectedPlan}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectPaymentMethod={setSelectedPaymentMethod}
          onCancel={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          onPay={handlePayment}
        />
      </AnimatePresence>

      <AnimatePresence>
        <UploadModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          defaultCategory={uploadDefaults.category}
          defaultSubCategory={uploadDefaults.subCategory}
          onUpload={uploadArchive}
          onUploaded={(entry) => {
            setEntries((prev) => [entry, ...prev]);
          }}
        />
      </AnimatePresence>

      <AnimatePresence>
        <PreviewModal
          open={showPreviewModal}
          file={previewFile}
          onClose={() => setShowPreviewModal(false)}
        />
      </AnimatePresence>

      <AnimatePresence>
        <NewFolderModal
          open={showNewFolderModal}
          folderName={newFolderName}
          setFolderName={setNewFolderName}
          onClose={() => {
            setShowNewFolderModal(false);
            setNewFolderName("");
          }}
          onCreate={handleCreateFolder}
          creating={folderCreating}
        />
      </AnimatePresence>
    </div>
  );
}

export default ArsipDigitalClient;
