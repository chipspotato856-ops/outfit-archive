"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Photo } from "@/lib/types";
import { PhotoCard } from "@/components/ui/photo-card";

export default function ArchivePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Stable per-photo rotation so cards don't jitter on re-render
  const rotations = useRef<Map<string, number>>(new Map());
  function getRotation(id: string) {
    if (!rotations.current.has(id)) {
      rotations.current.set(id, Math.random() * 4 - 2);
    }
    return rotations.current.get(id)!;
  }

  useEffect(() => {
    loadPhotos();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  async function loadPhotos() {
    setLoading(true);
    try {
      const res = await fetch("/api/photos");
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/photos", { method: "POST", body: formData });
        if (res.ok) count++;
      }
      showToast(count > 1 ? `${count} fits added` : "Fit added");
      await loadPhotos();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setActivePhoto(null);
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((p) => p.filter((ph) => ph.id !== id));
      showToast("Removed from archive");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-linen">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-linen via-linen/90 to-transparent">
        <span className="font-display italic font-semibold text-xl text-ink">
          archive
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-umber bg-card border border-taupe rounded-full px-2.5 py-1">
            {photos.length} {photos.length === 1 ? "fit" : "fits"}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-umber hover:text-ink transition-colors"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="max-w-[1400px] mx-auto px-4 pt-24 pb-36 flex flex-wrap gap-5 justify-center content-start min-h-screen">
        {loading ? (
          <p className="text-umber text-sm pt-24">Loading your archive…</p>
        ) : photos.length === 0 ? (
          <div className="w-full text-center pt-[18vh]">
            <p className="font-display italic text-2xl text-ink mb-2">
              empty rail
            </p>
            <p className="text-sm text-[#6b6055] max-w-[280px] mx-auto leading-relaxed">
              Tap the + to add your first fit. It'll sync across every device
              you log into.
            </p>
          </div>
        ) : (
          photos.map((photo, i) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              rotation={getRotation(photo.id)}
              delay={Math.min(i * 0.02, 0.3)}
              onClick={() => setActivePhoto(photo)}
            />
          ))
        )}
      </div>

      {/* Upload FAB */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        aria-label="Add outfit photo"
        className="fixed bottom-7 right-7 z-50 w-[58px] h-[58px] rounded-full bg-ink text-linen text-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(26,24,22,0.28)] hover:bg-umber hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
      >
        {uploading ? "…" : "+"}
      </button>

      {/* Lightbox */}
      {activePhoto && activePhoto.url && (
        <div
          className="fixed inset-0 z-[100] bg-ink/90 flex items-center justify-center p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivePhoto(null);
          }}
        >
          <button
            onClick={() => setActivePhoto(null)}
            aria-label="Close"
            className="absolute top-6 right-6 text-linen text-3xl opacity-80 hover:opacity-100"
          >
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activePhoto.url}
            alt="Outfit"
            className="max-w-full max-h-[78vh] object-contain shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
          />
          <button
            onClick={() => handleDelete(activePhoto.id)}
            className="absolute bottom-7 right-6 text-sm text-[#e8a98a] border border-[#e8a98a]/40 rounded-full px-3.5 py-1.5 hover:bg-[#e8a98a]/10 transition-colors"
          >
            Remove from archive
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-ink text-linen px-4.5 py-2.5 rounded-full text-sm z-[200]">
          {toast}
        </div>
      )}
    </main>
  );
}


 
 