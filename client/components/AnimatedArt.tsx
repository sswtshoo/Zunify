import React, { useState, useEffect, useRef } from 'react';
import { MdFullscreen } from 'react-icons/md';

interface AnimatedAlbumArtProps {
  imageUrl: string;
  isPlaying: boolean;
  onClick?: () => void;
  className?: string;
}

const AnimatedAlbumArt = ({
  imageUrl,
  isPlaying,
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
      onClick={onClick}
    >
      <MdFullscreen
        size={20}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
      />

      <div
        className="w-full h-full group"
        style={{
          transition: 'transform 0.6s ease-in-out',
          transformStyle: 'preserve-3d',
          transform: isFlipping ? 'rotateY(180deg)' : 'rotateY(0deg)',
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
            className="w-full h-full object-cover rounded-lg group-hover:opacity-80 transition-opacity aspect-square"
          />
        </div>
      </div>
    </div>
  );
};

export default AnimatedAlbumArt;
