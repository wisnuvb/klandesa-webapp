/**
 * Kontak dari landing (ContactModal → /api/contacts → Spreadsheet + email).
 * Deploy terpisah dari partner-mitra-webhook (URL Web App sendiri).
 *
 * 1) Ganti SPREADSHEET_ID (boleh file sama atau beda dengan sheet mitra).
 * 2) Set EXPECTED_SECRET sama dengan GOOGLE_APPS_SCRIPT_CONTACT_SECRET di .env Next.js jika dipakai.
 * 3) Deploy → Web app → Execute as: Me, Who has access: Anyone.
 * 4) URL /exec → GOOGLE_APPS_SCRIPT_CONTACT_URL
 */

var SPREADSHEET_ID = "GANTI_DENGAN_ID_SPREADSHEET";
var SHEET_NAME = "KontakLanding";
var EXPECTED_SECRET = "";

var SUBJECT_LABELS = {
  pendaftaran: "Informasi Pendaftaran",
  layanan: "Pertanyaan Layanan",
  teknis: "Bantuan Teknis",
  kerjasama: "Kerjasama",
  lainnya: "Lainnya",
};

function subjectLabel(code) {
  return SUBJECT_LABELS[code] || code || "";
}

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
    var subjectCode = String(p.subject || "").trim();
    var message = String(p.message || "").trim();

    if (!name || !email || !subjectCode || !message) {
      return jsonOut({ ok: false, error: "missing fields" });
    }

    var subjectDisplay = subjectLabel(subjectCode);

    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEET_NAME);
      sheet.appendRow(["Waktu", "Nama", "Email", "HP", "Subjek (kode)", "Subjek", "Pesan"]);
    }

    sheet.appendRow([
      new Date(),
      name,
      email,
      phone,
      subjectCode,
      subjectDisplay,
      message,
    ]);

    sendContactEmail(name, email, phone, subjectCode, subjectDisplay, message);

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

function sendContactEmail(name, email, phone, subjectCode, subjectDisplay, message) {
  var yourEmail = Session.getActiveUser().getEmail();
  if (!yourEmail) return;

  MailApp.sendEmail({
    to: yourEmail,
    subject: "[Klandesa Kontak] " + subjectDisplay + " — " + name,
    body:
      "Subjek: " +
      subjectDisplay +
      " (" +
      subjectCode +
      ")\n\n" +
      "Nama: " +
      name +
      "\nEmail: " +
      email +
      "\nHP: " +
      (phone || "-") +
      "\n\nPesan:\n" +
      message,
  });
}
