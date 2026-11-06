import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RecoveryCodes } from "../components/admin/security/RecoveryCodes.tsx";
import { readFileSync } from "node:fs";
import { SecurityConsole } from "../components/admin/security/SecurityConsole.tsx";
import { AuditViewer } from "../components/admin/security/AuditViewer.tsx";

const h = React.createElement;

describe("UI keamanan platform (render server)", () => {
  it("kode pemulihan: semua kode tampil, ada salin/unduh, tombol Selesai nonaktif sampai dicentang", () => {
    const codes = ["AAAA-BBBB-CCCC-DDDD", "EEEE-FFFF-GGGG-HHHH"];
    const html = renderToStaticMarkup(h(RecoveryCodes, { codes, onDone: () => {} }));
    for (const c of codes) assert.ok(html.includes(c));
    assert.match(html, /Salin semua/);
    assert.match(html, /Unduh \.txt/);
    assert.match(html, /Saya sudah menyimpan/);
    assert.match(html, /<button[^>]*disabled[^>]*>.*Selesai/s);
    assert.match(html, /role="alert"/);
  });

  it("kolom kode 2FA (dialog tidak dirender SSR, jadi diperiksa dari sumber): one-time-code, numeric, tanpa pemblokir paste", () => {
    for (const f of ["CodeStepUpDialog.tsx", "TwoFactorCard.tsx", "ChangePasswordCard.tsx"]) {
      const src = readFileSync(`components/admin/security/${f}`, "utf8");
      assert.match(src, /autoComplete="one-time-code"/, f);
      assert.match(src, /inputMode="numeric"/, f);
      assert.ok(!/onPaste/.test(src), f);
    }
    // Dialog konfirmasi umum: kolom kode 2FA bersyarat + totpCode ikut dikirim lewat onConfirm.
    const step = readFileSync("components/admin/StepUpDialog.tsx", "utf8");
    assert.match(step, /autoComplete="one-time-code"/);
    assert.match(step, /inputMode="numeric"/);
    assert.match(step, /totpCode\?: string/);
    assert.match(step, /onConfirm\(\{ confirmPassword: password, reason: reason\.trim\(\), \.\.\.\(showCode/);
    assert.ok(!/onPaste/.test(step));
    for (const f of ["components/admin/villages/SubscriptionTab.tsx", "components/admin/security/AdminsTab.tsx", "components/admin/security/InviteAdminDialog.tsx"]) {
      assert.match(readFileSync(f, "utf8"), /totpCode/, `${f} harus meneruskan totpCode`);
    }
    for (const f of ["components/admin/accounts/AccountDetailSheet.tsx", "components/admin/accounts/ResidentSearchPanel.tsx"]) {
      assert.match(readFileSync(f, "utf8"), /\.\.\.v\b/, `${f} menyebar seluruh nilai dialog (termasuk totpCode)`);
    }
    const signin = readFileSync("app/(app)/auth/signin/SignInForm.tsx", "utf8");
    assert.match(signin, /one-time-code/);
    assert.ok(!/onPaste/.test(signin));
  });

  it("kartu Keamanan: peringatan 'Aktifkan 2FA' bila belum aktif", () => {
    const src = readFileSync("components/admin/security/TwoFactorCard.tsx", "utf8");
    assert.match(src, /Aktifkan 2FA untuk akun Anda/);
    assert.match(src, /invalidateStepUpStatus/);
  });

  it("halaman Keamanan: dua tab berlabel Indonesia dan keadaan memuat (skeleton)", () => {
    const html = renderToStaticMarkup(h(SecurityConsole));
    assert.match(html, /Keamanan/);
    assert.match(html, /Akun saya/);
    assert.match(html, /Admin platform/);
    assert.match(html, /aria-busy="true"/);
  });

  it("jejak audit: setiap filter punya label terlihat; tabel memuat state muat", () => {
    const html = renderToStaticMarkup(h(AuditViewer));
    for (const l of ["Aktor", "Aksi", "Jenis target", "ID desa", "Dari tanggal", "Sampai tanggal"]) assert.ok(html.includes(l), l);
    assert.match(html, /Jejak Audit/);
    assert.match(html, /aria-busy="true"/);
  });
});
