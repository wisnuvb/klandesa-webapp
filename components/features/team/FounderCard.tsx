import Image from "next/image";

import type { Founder } from "@/lib/team/founders";

type Props = {
  founder: Founder;
};

export function FounderCard({ founder }: Props) {
  return (
    <article className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
      <div className="relative size-40 md:size-44 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
        {founder.image ? (
          <Image
            src={founder.image}
            alt={`Foto ${founder.name}`}
            fill
            sizes="176px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <span className="text-4xl font-semibold text-gray-600 tracking-tight">
              {founder.initials}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 text-center sm:text-left">
        <p className="text-sm font-medium text-[#0f766e]">Founder</p>
        <h3 className="text-2xl font-semibold text-gray-900 leading-snug">
          {founder.name}
        </h3>
        <p className="text-gray-600 leading-relaxed">{founder.role}</p>
      </div>
    </article>
  );
}
