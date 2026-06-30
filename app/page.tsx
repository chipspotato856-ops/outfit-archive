import React, { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Instagram } from "lucide-react";

// Placeholder images - replace these with your own fit pics
const images = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1612731486606-2614b4d74921?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1613915617430-8ab0fd7c6baf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1624407302982-3d99224f6a99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1619199059624-7335464ea7b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
];

const ITEM_COUNT = 80; // More items for that "infinite stars" feel
const SPREAD = 5000; // How wide the canvas is spread out

// Generate random positions and depths for the images
const generateItems = () => {
  return Array.from({ length: ITEM_COUNT }).map((_, i) => {
    // Depth ranges from 0.1 (far away) to 1.5 (very close)
    const depth = 0.1 + Math.random() * 1.4;
    return {
      id: i,
      src: images[i % images.length],
      // Spread them across a massive virtual coordinate system
      x: (Math.random() - 0.5) * SPREAD,
      y: (Math.random() - 0.5) * SPREAD,
      depth,
      // The further away, the smaller it appears (base size tweaked by depth later)
      baseSize: 150 + Math.random() * 200, 
    };
  });
};

function PhotoItem({ item, smoothMouseX, smoothMouseY }) {
  const PARALLAX_AMOUNT = 300; 
  
  const xMove = useTransform(smoothMouseX, (val) => val * PARALLAX_AMOUNT * item.depth * -1);
  const yMove = useTransform(smoothMouseY, (val) => val * PARALLAX_AMOUNT * item.depth * -1);

  return (
    <motion.div
      className="absolute origin-center group"
      style={{
        left: `calc(50% + ${item.x}px)`,
        top: `calc(50% + ${item.y}px)`,
        width: item.baseSize,
        scale: item.depth, // Scale based on depth to simulate 3D space
        zIndex: Math.floor(item.depth * 100),
        x: xMove,
        y: yMove,
      }}
      whileHover={{
        scale: item.depth + 0.05,
        zIndex: 9999,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-neutral-900 rounded-sm">
        <img
          src={item.src}
          alt={`Archive fit pic ${item.id}`}
          className="w-full h-full object-cover filter brightness-[0.7] contrast-125 hover:brightness-110 transition-all duration-700 ease-out pointer-events-none"
          draggable={false}
        />
      </div>
    </motion.div>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const containerRef = useRef(null);

  // Track raw mouse position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring animations for ultra-smooth floating movement
  const springConfig = { damping: 40, stiffness: 100, mass: 1 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  useEffect(() => {
    setItems(generateItems());

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates from -1 to 1 based on screen center
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="relative w-screen h-screen bg-[#0a0a0a] overflow-hidden select-none font-sans">
      
      {/* Draggable massive canvas */}
      <motion.div
        ref={containerRef}
        drag
        dragConstraints={{ left: -SPREAD / 2, right: SPREAD / 2, top: -SPREAD / 2, bottom: SPREAD / 2 }}
        dragElastic={0.2}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
      >
        {items.map((item) => (
          <PhotoItem 
            key={item.id} 
            item={item} 
            smoothMouseX={smoothMouseX} 
            smoothMouseY={smoothMouseY} 
          />
        ))}
      </motion.div>

      {/* UI Overlay - Minimalist exact theme */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-[9999]">
        {/* Top Header */}
        <header className="flex justify-between items-start w-full">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className="text-white text-xl md:text-2xl font-medium tracking-tight">
              archive
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              an infinite canvas of outfits.
            </p>
          </motion.div>
          
          <motion.a 
            href="#"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1 }}
            className="pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-full transition-colors"
          >
            <Instagram size={20} />
          </motion.a>
        </header>

        {/* Bottom Footer / Action */}
        <footer className="flex justify-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="pointer-events-auto"
          >
            <button className="bg-white text-black px-6 py-3 rounded-full text-sm font-medium tracking-wide hover:scale-105 transition-transform">
              Explore Archive
            </button>
          </motion.div>
        </footer>
      </div>

    </div>
  );
}
