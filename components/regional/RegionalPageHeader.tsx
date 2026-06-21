"use client";

type Props = {
  title: string;
  description?: string;
  userName?: string | null;
};

export function RegionalPageHeader({ title, description, userName }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {(description || userName) && (
        <p className="text-sm text-muted-foreground mt-1">
          {userName ? `Halo, ${userName}. ` : ""}
          {description}
        </p>
      )}
    </div>
  );
}
