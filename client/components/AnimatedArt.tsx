import React, { useState, useEffect, useRef } from 'react';

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
  const [frontImage, setFrontImage] = useState(imageUrl);
  const [backImage, setBackImage] = useState(imageUrl);
  const [showFront, setShowFront] = useState(true);
  const lastImageRef = useRef(imageUrl);

  useEffect(() => {
    if (imageUrl !== lastImageRef.current) {
      setIsFlipping(true);

      if (showFront) {
        setBackImage(imageUrl);
      } else {
        setFrontImage(imageUrl);
      }

      const flipTimeout = setTimeout(() => {
        setShowFront(!showFront);
        lastImageRef.current = imageUrl;

        setTimeout(() => {
          setIsFlipping(false);
        }, 300);
      }, 300);

      return () => clearTimeout(flipTimeout);
    }
  }, [imageUrl, showFront]);

  return (
    <div
      className={`relative ${className}`}
      style={{
        perspective: '1000px',
      }}
      onClick={onClick}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s ease-in-out',
          transform: isFlipping
            ? `rotateY(${showFront ? 180 : -180}deg)`
            : 'rotateY(0deg)',
        }}
      >
        <div
          className="absolute w-full h-full"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: showFront ? 'rotateY(0deg)' : 'rotateY(180deg)',
          }}
        >
          <img
            src={frontImage}
            alt="Album art front"
            className="w-full h-full object-cover rounded-lg hover:opacity-70 transition-opacity"
          />
        </div>

        <div
          className="absolute w-full h-full"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: showFront ? 'rotateY(-180deg)' : 'rotateY(0deg)',
          }}
        >
          <img
            src={backImage}
            alt="Album art back"
            className="w-full h-full object-cover rounded-lg hover:opacity-70 transition-opacity"
          />
        </div>
      </div>
    </div>
  );
};

export default AnimatedAlbumArt;
