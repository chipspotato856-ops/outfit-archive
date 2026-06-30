"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Photo } from "@/lib/types";

const SPREAD = 5000;

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return (h >>> 0) / 0xffffffff;
}

function generateItems(photos: Photo[]) {
  return photos.map((photo) => ({
    photo,
    x: (seededRandom(photo.id + "x") - 0.5) * SPREAD,
    y: (seededRandom(photo.id + "y") - 0.5) * SPREAD,
    depth: 0.3 + seededRandom(photo.id + "d") * 1.2,
    baseSize: 150 + seededRandom(photo.id + "s") * 200,
  }));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")} ${d.getFullYear()}`;
}

function PhotoItem({
  item,
  smoothMouseX,
  smoothMouseY,
  onClick,
}: {
  item: ReturnType<typeof generateItems>[0];
  smoothMouseX: any;
  smoothMouseY: any;
  onClick: () => void;
}) {
  const PARALLAX_AMOUNT = 300;
  const xMove = useTransform(smoothMouseX, (val: number) => val * PARALLAX_AMOUNT * item.depth * -1);
  const yMove = useTransform(smoothMouseY, (val: number) => val * PARALLAX_AMOUNT * item.depth * -1);

  if (!item.photo.url) return null;

  return (
    <motion.div
      className="absolute origin-center group cursor-pointer"
      style={{
        left: `calc(50% + ${item.x}px)`,
        top: `calc(50% + ${item.y}px)`,
        width: item.baseSize,
        scale: item.depth,
        zIndex: Math.floor(item.depth * 100),
        x: xMove,
        y: yMove,
      }}
      whileHover={{
        scale: item.depth + 0.08,
        zIndex: 9999,
        transition: { duration: 0.3, ease: "easeOut" },
      }}
      onClick={onClick}
    >
      <div className="relative w-full overflow-hidden bg-neutral-900 rounded-sm" style={{ aspectRatio: "4/5" }}>
        <img
          src={item.photo.url}
          alt=""
          className="w-full h-full object-cover brightness-75 contrast-125 hover:brightness-110 transition-all duration-700 ease-out pointer-events-none"
          draggable={false}
        />
        <span className="absolute bottom-1.5 left-2 text-[9px] font-mono text-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {formatDate(item.photo.created_at)}
        </span>
      </div>
    </motion.div>
  );
}

export default function ArchivePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 40, stiffness: 100, mass: 1 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  useEffect(() => {
    loadPhotos();
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 2);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function loadPhotos() {
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

  const items = generateItems(photos);

  return (
    <div className="relative w-screen h-screen bg-[#0a0a0a] overflow-hidden select-none font-sans">

      {/* Draggable canvas */}
      <motion.div
        drag
        dragConstraints={{ left: -SPREAD / 2, right: SPREAD / 2, top: -SPREAD / 2, bottom: SPREAD / 2 }}
        dragElastic={0.2}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
      >
        {loading ? null : photos.length === 0 ? (
          <div className="text-center pointer-events-none">
            <p className="text-white/60 text-lg font-medium">empty archive</p>
            <p className="text-white/30 text-sm mt-1">tap + to add your first fit</p>
          </div>
        ) : (
          items.map((item) => (
            <PhotoItem
              key={item.photo.id}
              item={item}
              smoothMouseX={smoothMouseX}
              smoothMouseY={smoothMouseY}
              onClick={() => setActivePhoto(item.photo)}
            />
          ))
        )}
      </motion.div>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-[9999]">
        <header className="flex justify-between items-start w-full">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <h1 className="text-white text-xl md:text-2xl font-medium tracking-tight">archive</h1>
            <p className="text-neutral-500 text-sm mt-1">
              {photos.length > 0 ? `${photos.length} fit${photos.length === 1 ? "" : "s"} in your archive` : "an infinite canvas of outfits."}
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1 }}
            onClick={handleLogout}
            className="pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/60 hover:text-white px-4 py-2 rounded-full text-xs transition-all"
          >
            log out
          </motion.button>
        </header>

        <footer className="flex justify-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="pointer-events-auto flex gap-3"
          >
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-white text-black px-6 py-3 rounded-full text-sm font-medium tracking-wide hover:scale-105 transition-transform disabled:opacity-50"
            >
              {uploading ? "Adding…" : "+ Add fit"}
            </button>
          </motion.div>
        </footer>
      </div>

      {/* Lightbox */}
      {activePhoto && activePhoto.url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setActivePhoto(null); }}
        >
          <button onClick={() => setActivePhoto(null)} className="absolute top-6 right-6 text-white/60 hover:text-white text-3xl leading-none">×</button>
          <motion.img
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            src={activePhoto.url}
            alt=""
            className="max-w-full max-h-[78vh] object-contain"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
          />
          <div className="absolute bottom-7 left-0 right-0 flex justify-center">
            <span className="font-mono text-xs text-white/30 tracking-widest">
              {formatDate(activePhoto.created_at)}
            </span>
          </div>
          <button
            onClick={() => handleDelete(activePhoto.id)}
            className="absolute bottom-6 right-6 text-[#e8a98a] border border-[#e8a98a]/40 rounded-full px-4 py-2 text-xs hover:bg-[#e8a98a]/10 transition-colors"
          >
            Remove
          </button>
        </motion.div>
      )}

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-full text-sm z-[999999]"
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}