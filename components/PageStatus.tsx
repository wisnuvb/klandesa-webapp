"use client";

import { motion } from "motion/react";
import {
  Construction,
  Wrench,
  Rocket,
  AlertTriangle,
  Info,
  Lock,
  CheckCircle,
  Clock,
  Zap,
  LucideIcon,
} from "lucide-react";

export type PageStatusType =
  | "development"
  | "maintenance"
  | "coming-soon"
  | "beta"
  | "warning"
  | "info"
  | "locked"
  | "success"
  | "experimental";

interface PageStatusConfig {
  icon: LucideIcon;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  defaultTitle: string;
  defaultMessage: string;
}

const statusConfigs: Record<PageStatusType, PageStatusConfig> = {
  development: {
    icon: Construction,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-900",
    iconColor: "text-yellow-600",
    defaultTitle: "🚧 Dalam Tahap Pengembangan",
    defaultMessage: "Halaman ini sedang dalam proses pengembangan.",
  },
  maintenance: {
    icon: Wrench,
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-900",
    iconColor: "text-orange-600",
    defaultTitle: "🔧 Dalam Pemeliharaan",
    defaultMessage: "Halaman ini sedang dalam pemeliharaan.",
  },
  "coming-soon": {
    icon: Rocket,
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-900",
    iconColor: "text-purple-600",
    defaultTitle: "🚀 Segera Hadir",
    defaultMessage: "Fitur ini akan segera tersedia.",
  },
  beta: {
    icon: Zap,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-900",
    iconColor: "text-blue-600",
    defaultTitle: "⚡ Beta Version",
    defaultMessage: "Halaman ini masih dalam versi beta.",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-900",
    iconColor: "text-red-600",
    defaultTitle: "⚠️ Peringatan",
    defaultMessage: "Harap berhati-hati saat menggunakan halaman ini.",
  },
  info: {
    icon: Info,
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-900",
    iconColor: "text-cyan-600",
    defaultTitle: "ℹ️ Informasi",
    defaultMessage: "Informasi penting tentang halaman ini.",
  },
  locked: {
    icon: Lock,
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
    textColor: "text-gray-900",
    iconColor: "text-gray-600",
    defaultTitle: "🔒 Terkunci",
    defaultMessage: "Anda tidak memiliki akses ke halaman ini.",
  },
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-900",
    iconColor: "text-green-600",
    defaultTitle: "✅ Berhasil",
    defaultMessage: "Operasi berhasil dilakukan.",
  },
  experimental: {
    icon: Clock,
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-900",
    iconColor: "text-indigo-600",
    defaultTitle: "🧪 Eksperimental",
    defaultMessage: "Fitur ini masih dalam tahap eksperimen.",
  },
};

interface PageStatusProps {
  type?: PageStatusType;
  title?: string;
  message?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg" | "full";
  dismissible?: boolean;
  onDismiss?: () => void;
  children?: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export function PageStatus({
  type = "development",
  title,
  message,
  showIcon = true,
  size = "md",
  dismissible = false,
  onDismiss,
  children,
  className = "",
  animate = true,
}: PageStatusProps) {
  const config = statusConfigs[type];
  const Icon = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  const sizeClasses = {
    sm: "p-3 rounded-lg",
    md: "p-6 rounded-xl",
    lg: "p-8 rounded-2xl",
    full: "p-12 rounded-3xl",
  };

  const textSizeClasses = {
    sm: {
      title: "text-sm font-semibold",
      message: "text-xs",
      icon: "w-4 h-4",
    },
    md: {
      title: "text-base font-semibold",
      message: "text-sm",
      icon: "w-5 h-5",
    },
    lg: {
      title: "text-lg font-bold",
      message: "text-base",
      icon: "w-6 h-6",
    },
    full: {
      title: "text-2xl font-bold",
      message: "text-lg",
      icon: "w-8 h-8",
    },
  };

  const content = (
    <div
      className={`${config.bgColor} ${config.borderColor} border-2 ${sizeClasses[size]} ${className}`}
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <div className="shrink-0">
            <Icon
              className={`${textSizeClasses[size].icon} ${config.iconColor}`}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={`${textSizeClasses[size].title} ${config.textColor}`}>
            {displayTitle}
          </h3>
          <p
            className={`${textSizeClasses[size].message} ${config.textColor} opacity-80 mt-1`}
          >
            {displayMessage}
          </p>
          {children && (
            <div className={`mt-3 ${config.textColor}`}>{children}</div>
          )}
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`shrink-0 p-1 rounded hover:bg-black hover:bg-opacity-5 transition-colors ${config.textColor}`}
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

// Compact inline version for smaller spaces
interface InlinePageStatusProps {
  type?: PageStatusType;
  text?: string;
  showIcon?: boolean;
  className?: string;
}

export function InlinePageStatus({
  type = "development",
  text,
  showIcon = true,
  className = "",
}: InlinePageStatusProps) {
  const config = statusConfigs[type];
  const Icon = config.icon;
  const displayText = text || config.defaultTitle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.bgColor} ${config.borderColor} ${config.textColor} border ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {displayText}
    </span>
  );
}

// Full page overlay version
interface FullPageStatusProps {
  type?: PageStatusType;
  title?: string;
  message?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function FullPageStatus({
  type = "development",
  title,
  message,
  showIcon = true,
  children,
  action,
}: FullPageStatusProps) {
  const config = statusConfigs[type];
  const Icon = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[60vh] flex items-center justify-center p-6 bg-white rounded-md shadow"
    >
      <div className="max-w-2xl w-full text-center">
        {showIcon && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${config.bgColor} ${config.borderColor} border-4 mb-6`}
          >
            <Icon className={`w-12 h-12 ${config.iconColor}`} />
          </motion.div>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`text-3xl md:text-4xl font-bold ${config.textColor} mb-4`}
        >
          {displayTitle}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`text-lg ${config.textColor} opacity-80 mb-6`}
        >
          {displayMessage}
        </motion.p>

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            {children}
          </motion.div>
        )}

        {action && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={action.onClick}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${config.bgColor} ${config.borderColor} ${config.textColor} border-2 hover:opacity-80`}
            >
              {action.label}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
