"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const FishClicker = () => {
  const [scale, setScale] = useState(1);
  const [plusOnes, setPlusOnes] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const shrinkInterval = useRef<NodeJS.Timeout | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  let clickId = 0; // Benzersiz ID için

  const handleMouseDown = (
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.preventDefault(); // Varsayılan seçim davranışını engelle

    const boundingBox =
      containerRef.current?.getBoundingClientRect();
    if (!boundingBox) return;

    let x = 0,
      y = 0;

    if ("clientX" in e) {
      x = e.clientX - boundingBox.left;
      y = e.clientY - boundingBox.top;
    } else {
      x = e.touches[0].clientX - boundingBox.left;
      y = e.touches[0].clientY - boundingBox.top;
    }

    // Yeni +1 ekle
    setPlusOnes((prev) => [
      ...prev,
      { id: clickId++, x, y },
    ]);

    // Balık büyümesi
    setScale((prev) => Math.min(prev + 0.1, 3));

    // Shrink interval'ı temizle
    if (shrinkInterval.current) {
      clearInterval(shrinkInterval.current);
      shrinkInterval.current = null;
    }
  };

  const handleMouseUp = () => {
    if (shrinkInterval.current) return;

    shrinkInterval.current = setInterval(() => {
      setScale((prev) => {
        if (prev <= 1.01) {
          if (shrinkInterval.current) {
            clearInterval(shrinkInterval.current);
            shrinkInterval.current = null;
          }
          return 1;
        }
        return prev - 0.05;
      });
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (shrinkInterval.current) {
        clearInterval(shrinkInterval.current);
      }
    };
  }, []);

  // +1 yazısını listeden kaldırma
  const removePlusOne = (id: number) => {
    setPlusOnes((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onDragStart={(e) => e.preventDefault()} // Sürüklemeyi engelle
      className="relative inline-block mx-auto select-none cursor-pointer items-center justify-center touch-manipulation "
    >
      {plusOnes.map((plusOne) => (
        <motion.div
          key={plusOne.id}
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{ y: -40, opacity: 0, scale: 1.2 }} // Yukarı hareket, saydamlaşma, hafif büyüme
          transition={{ duration: 0.6, ease: "easeOut" }}
          onAnimationComplete={() =>
            removePlusOne(plusOne.id)
          } // Animasyon bittiğinde kaldır
          className="absolute text-lg md:text-xl font-bold text-white drop-shadow-md pointer-events-none z-10"
          style={{
            top: plusOne.y,
            left: plusOne.x,
            transform: "translate(-50%, -50%)",
          }}
        >
          +1
        </motion.div>
      ))}

      <Image
        src="/fish.png"
        alt="Fish"
        width={200}
        height={200}
        draggable={false} // Resim sürüklenmesini engelle
        className="z-1 select-none pointer-events-none pl-3"
        style={{
          transform: `scale(${scale})`,
          transition: "transform 0.1s linear",
        }}
      />
    </div>
  );
};

export default FishClicker;
