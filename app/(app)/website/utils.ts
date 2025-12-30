// Utility functions for Website Management

export const getDaysUntilExpiration = (expiresAt: string): number => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const copyToClipboard = async (
  text: string,
  onSuccess: () => void,
  onError: () => void
) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      onSuccess();
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-999999px";
      textarea.style.top = "-999999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const result = document.execCommand("copy");
      textarea.remove();
      if (result) {
        onSuccess();
      } else {
        onError();
      }
    }
  } catch {
    onError();
  }
};

export const getBadgeColor = (badge?: string) => {
  switch (badge) {
    case "Popular":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Recommended":
      return "bg-teal-100 text-teal-700 border-teal-200";
    case "Best Seller":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};
