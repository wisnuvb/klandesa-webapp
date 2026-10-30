/**
 * NextAuth (redirect: false) mengembalikan `error` berupa kode baku ("CredentialsSignin")
 * atau pesan dari authorize(). Ubah kode baku menjadi kalimat yang bisa ditindaklanjuti.
 */
const CODE_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email atau password salah. Periksa kembali lalu coba lagi.",
  SessionRequired: "Sesi berakhir. Silakan masuk kembali.",
  Configuration: "Layanan login sedang bermasalah. Silakan coba beberapa saat lagi.",
  Default: "Gagal masuk. Silakan coba lagi.",
};

export function loginErrorMessage(error: string | null | undefined): string {
  if (!error) return CODE_MESSAGES.Default;
  return CODE_MESSAGES[error] ?? error;
}
