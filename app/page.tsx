"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Photo } from "@/lib/types";

// Stable random position seeded by photo id
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) / 0xffffffff);
}

function getPhotoStyle(photo: Photo, index: number) {
  const r1 = seededRandom(photo.id + "x");
  const r2 = seededRandom(photo.id + "y");
  const r3 = seededRandom(photo.id + "rot");
  const r4 = seededRandom(photo.id + "w");

  const x = r1 * 3200 - 400;
  const y = r2 * 2400 - 300;
  const rot = r3 * 10 - 5;
  const width = 180 + r4 * 80;

  return { x, y, rot, width };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")} ${d.getFullYear()}`;
}

export default function ArchivePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  // Canvas pan state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadPhotos(); }, []);

  // Stagger photos appearing one by one
  useEffect(() => {
    if (photos.length === 0) return;
    setVisibleCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= photos.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, [photos]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function loadPhotos() {
    setLoading(false);
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
      setPhotos(p => p.filter(ph => ph.id !== id));
      showToast("Removed from archive");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Mouse drag
  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(".photo-card")) return;
    isDragging.current = true;
    didDrag.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
    e.preventDefault();
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
    setOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy });
  }

  function onMouseUp() { isDragging.current = false; }

  // Touch drag
  function onTouchStart(e: React.TouchEvent) {
    if ((e.target as HTMLElement).closest(".photo-card")) return;
    const t = e.touches[0];
    isDragging.current = true;
    didDrag.current = false;
    dragStart.current = { x: t.clientX, y: t.clientY };
    offsetStart.current = { ...offset };
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.x;
    const dy = t.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
    setOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy });
    e.preventDefault();
  }

  function onTouchEnd() { isDragging.current = false; }

  function handlePhotoClick(photo: Photo) {
    if (didDrag.current) return;
    setActivePhoto(photo);
  }

  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={{ background: "#EDE7DD", cursor: isDragging.current ? "grabbing" : "grab" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 pointer-events-none">
        <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 22, color: "#1A1816", pointerEvents: "auto" }}>
          archive
        </span>
        <div className="flex items-center gap-3" style={{ pointerEvents: "auto" }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9C8568", background: "white", border: "1px solid #C4B8A5", borderRadius: 100, padding: "4px 10px" }}>
            {photos.length} {photos.length === 1 ? "fit" : "fits"}
          </span>
          <button onClick={handleLogout} style={{ fontSize: 12, color: "#9C8568", background: "none", border: "none", cursor: "pointer" }}>
            log out
          </button>
        </div>
      </div>

      {/* Infinite canvas */}
      <div
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          willChange: "transform",
          transition: isDragging.current ? "none" : "transform 0.05s ease-out",
        }}
      >
        {loading ? null : photos.length === 0 ? (
          <div style={{ position: "absolute", top: "40vh", left: "50%", transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none" }}>
            <p style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 26, color: "#1A1816", marginBottom: 8 }}>empty rail</p>
            <p style={{ fontSize: 13, color: "#6b6055", maxWidth: 260, lineHeight: 1.5 }}>Tap + to add your first fit. Drag to explore the canvas.</p>
          </div>
        ) : (
          photos.map((photo, i) => {
            const { x, y, rot, width } = getPhotoStyle(photo, i);
            const visible = i < visibleCount;
            if (!photo.url) return null;
            return (
              <div
                key={photo.id}
                className="photo-card"
                onClick={() => handlePhotoClick(photo)}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width,
                  background: "white",
                  padding: "8px 8px 28px",
                  boxShadow: "0 2px 4px rgba(26,24,22,0.06), 0 8px 24px rgba(26,24,22,0.12)",
                  transform: `rotate(${rot}deg) translateY(${visible ? 0 : 20}px)`,
                  opacity: visible ? 1 : 0,
                  transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(.16,1,.3,1), box-shadow 0.2s ease",
                  cursor: "pointer",
                  userSelect: "none",
                  willChange: "transform, opacity",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.transform = `rotate(0deg) translateY(-6px) scale(1.03)`;
                  el.style.boxShadow = "0 8px 16px rgba(26,24,22,0.10), 0 24px 48px rgba(26,24,22,0.18)";
                  el.style.zIndex = "10";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.transform = `rotate(${rot}deg) translateY(0px) scale(1)`;
                  el.style.boxShadow = "0 2px 4px rgba(26,24,22,0.06), 0 8px 24px rgba(26,24,22,0.12)";
                  el.style.zIndex = "1";
                }}
              >
                <img
                  src={photo.url}
                  alt=""
                  draggable={false}
                  style={{ display: "block", width: "100%", aspectRatio: "3/4", objectFit: "cover", background: "#DCD3C3" }}
                />
                <span style={{ position: "absolute", bottom: 8, left: 10, fontFamily: "monospace", fontSize: 9, color: "#C4B8A5", letterSpacing: "0.03em" }}>
                  {formatDate(photo.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Upload FAB */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 60,
          width: 56, height: 56, borderRadius: "50%",
          background: "#1A1816", color: "#EDE7DD",
          border: "none", fontSize: 26, cursor: "pointer",
          boxShadow: "0 8px 24px rgba(26,24,22,0.28)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s ease, background 0.2s ease",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#9C8568"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#1A1816"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        {uploading ? "…" : "+"}
      </button>

      {/* Hint */}
      {photos.length > 0 && (
        <div style={{ position: "fixed", bottom: 34, left: "50%", transform: "translateX(-50%)", fontFamily: "monospace", fontSize: 10, color: "#C4B8A5", letterSpacing: "0.06em", pointerEvents: "none" }}>
          DRAG TO EXPLORE
        </div>
      )}

      {/* Lightbox */}
      {activePhoto && activePhoto.url && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(26,24,22,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={e => { if (e.target === e.currentTarget) setActivePhoto(null); }}
        >
          <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } } @keyframes scaleIn { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }`}</style>
          <button onClick={() => setActivePhoto(null)} style={{ position: "absolute", top: 24, right: 26, background: "none", border: "none", color: "#EDE7DD", fontSize: 30, cursor: "pointer", opacity: 0.8 }}>×</button>
          <img
            src={activePhoto.url}
            alt=""
            style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", animation: "scaleIn 0.25s cubic-bezier(.16,1,.3,1)" }}
          />
          <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#C4B8A5", letterSpacing: "0.06em" }}>
              {formatDate(activePhoto.created_at)}
            </span>
          </div>
          <button
            onClick={() => handleDelete(activePhoto.id)}
            style={{ position: "absolute", bottom: 24, right: 24, background: "none", border: "1px solid rgba(232,169,138,0.4)", color: "#e8a98a", borderRadius: 100, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}
          >
            Remove
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#1A1816", color: "#EDE7DD", padding: "10px 18px", borderRadius: 100, fontSize: 13, zIndex: 200, animation: "fadeIn 0.2s ease" }}>
          {toast}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </main>
  );
}