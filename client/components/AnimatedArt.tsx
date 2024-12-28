import React, { useState, useEffect, useRef } from 'react';
import { MdFullscreen } from 'react-icons/md';
import { motion } from 'motion/react';
import { ArrowsOutSimple } from '@phosphor-icons/react';

interface AnimatedAlbumArtProps {
  imageUrl: string;
  isPlaying: boolean;
  onClick?: () => void;
  className?: string;
}

const AnimatedAlbumArt = ({
  imageUrl,
  onClick,
  className = '',
}: AnimatedAlbumArtProps) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [currentImage, setCurrentImage] = useState(imageUrl);
  const lastImageUrl = useRef(imageUrl);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (imageUrl !== lastImageUrl.current && !isAnimating.current) {
      isAnimating.current = true;
      setIsFlipping(true);

      const flipTimeout = setTimeout(() => {
        setCurrentImage(imageUrl);
        lastImageUrl.current = imageUrl;
        setIsFlipping(false);
        isAnimating.current = false;
      }, 300);

      return () => clearTimeout(flipTimeout);
    }
  }, [imageUrl]);

  return (
    <div
      className={`relative ${className}`}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        cursor: 'pointer',
      }}
    >
      <div
        className="w-full h-full group"
        style={{
          transition: 'transform 0.6s ease-in-out',
          transformStyle: 'preserve-3d',
          transform: isFlipping ? 'rotateY(-180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          className="absolute w-full h-full"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <img
            src={currentImage}
            alt="Album art"
            className="w-full h-full object-cover rounded-lg group-hover:opacity-70 transition-opacity aspect-square"
          />
        </div>
      </div>
    </div>
  );
};

export default AnimatedAlbumArt;
