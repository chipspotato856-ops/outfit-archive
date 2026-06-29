"use client";

import { Photo } from "@/lib/types";

function formatDate(iso: string) {
  const d = new Date(iso);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")} — ${d.getFullYear()}`;
}

export function PhotoCard({
  photo,
  rotation,
  delay,
  onClick,
}: {
  photo: Photo;
  rotation: number;
  delay: number;
  onClick: () => void;
}) {
  if (!photo.url) return null;

  return (
    <div
      onClick={onClick}
      className="card-rise bg-card p-2.5 pb-7 w-[220px] cursor-pointer relative transition-transform duration-200 hover:!rotate-0 hover:-translate-y-1 hover:z-10"
      style={{
        transform: `rotate(${rotation}deg)`,
        animationDelay: `${delay}s`,
        boxShadow: "0 1px 2px rgba(26,24,22,0.04), 0 8px 20px rgba(26,24,22,0.10)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={`Outfit from ${formatDate(photo.created_at)}`}
        loading="lazy"
        className="block w-full h-[260px] object-cover bg-tauposoft"
      />
      <span className="absolute bottom-2 left-3 font-mono text-[10px] text-taupe tracking-wide">
        {formatDate(photo.created_at)}
      </span>
    </div>
  );
}
