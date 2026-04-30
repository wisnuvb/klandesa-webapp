/**
 * Google Apps Script — salin ke editor script terikat Spreadsheet (Extensions → Apps Script).
 *
 * Setup:
 * 1) Ganti SPREADSHEET_ID dengan ID file sheet Anda (dari URL drive).
 * 2) Opsional: set EXPECTED_SECRET sama dengan GOOGLE_FORM_PARTNER_APPS_SCRIPT_SECRET di .env Next.js.
 * 3) Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * 4) Salin URL .../exec ke GOOGLE_FORM_PARTNER_APPS_SCRIPT_URL
 *
 * Email notifikasi: sesuaikan YOUR_EMAIL atau matikan sendEmail().
 */

var SPREADSHEET_ID = "GANTI_DENGAN_ID_SPREADSHEET";
var SHEET_NAME = "Mitra"; // buat sheet dengan nama ini, atau ganti ke nama sheet Anda
var EXPECTED_SECRET = ""; // kosongkan jika tanpa secret; atau isi string yang sama dengan .env

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, error: "no body" });
    }

    var p = JSON.parse(e.postData.contents);

    if (EXPECTED_SECRET && p.webhookSecret !== EXPECTED_SECRET) {
      return jsonOut({ ok: false, error: "unauthorized" });
    }

    var name = String(p.name || "").trim();
    var email = String(p.email || "").trim();
    var phone = String(p.phone || "").trim();
    var region = String(p.region || "").trim();
    var message = String(p.message || "").trim();

    if (!name || !email || !phone || !region || !message) {
      return jsonOut({ ok: false, error: "missing fields" });
    }

    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_NAME);
      sheet.appendRow(["Waktu", "Nama", "Email", "HP", "Wilayah", "Pesan"]);
    }

    sheet.appendRow([
      new Date(),
      name,
      email,
      phone,
      region,
      message,
    ]);

    sendEmail(name, email, phone, region, message);

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function sendEmail(name, email, phone, region, message) {
  var yourEmail = Session.getActiveUser().getEmail();
  if (!yourEmail) return;

  MailApp.sendEmail({
    to: yourEmail,
    subject: "[Klandesa] Pendaftaran mitra baru: " + name,
    body:
      "Nama: " +
      name +
      "\nEmail: " +
      email +
      "\nHP: " +
      phone +
      "\nWilayah: " +
      region +
      "\n\nPesan:\n" +
      message,
  });
}
