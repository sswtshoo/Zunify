import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoPlaySkipBack, IoPlaySkipForward } from 'react-icons/io5';
import { RxCross2 } from 'react-icons/rx';
import ColorThief from 'colorthief/dist/color-thief.mjs';

interface Track {
  album?: {
    name: string;
    id: string;
    images: {
      height: number;
      url: string;
      width: number;
    }[];
  };
  name?: string;
  id?: string;
  uri?: string;
  isLiked?: boolean;
  artists?: {
    name: string;
    id: string;
  }[];
  duration_ms?: number;
}

interface FullscreenPlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  position: number;
  duration: number;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  volume: number;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleMute: () => void;
}

interface Images {
  height: number;
  url: string;
  width: number;
}

interface Artist {
  name: string;
  id: string;
}

const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getHighestQualityImage = (images: Images[]) => {
  if (!images || images.length === 0) return '';
  const sortedImages = [...images].sort(
    (a, b) => b.width * b.height - a.width * a.height
  );
  return sortedImages[0].url;
};

const FullscreenPlayer = ({
  currentTrack,
  isPlaying,
  onClose,
  onTogglePlay,
  onNext,
  onPrevious,
  position,
  duration,
  onSeek,
}: FullscreenPlayerProps) => {
  const [isNameOverflowing, setIsNameOverflowing] = useState(false);
  const [isArtistsOverflowing, setIsArtistsOverflowing] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  const artistsRef = useRef<HTMLDivElement>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  // const colorThief = new ColorThief();
  // const img = document.querySelector('img');

  // if (img?.complete) {
  //   colorThief.getPalette(img);
  // } else {
  //   img?.addEventListener('load', () => {
  //     colorThief.getPalette(img);
  //   });
  // }

  useEffect(() => {
    const checkOverflow = () => {
      if (nameRef.current) {
        setIsNameOverflowing(
          nameRef.current.scrollWidth > nameRef.current.clientWidth
        );
      }
      if (artistsRef.current) {
        setIsArtistsOverflowing(
          artistsRef.current.scrollWidth > artistsRef.current.clientWidth
        );
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [currentTrack]);

  console.log(isNameOverflowing);

  useEffect(() => {
    if (currentTrack?.album?.images) {
      const highQualityUrl = getHighestQualityImage(currentTrack.album.images);
      if (highQualityUrl) {
        const img = new Image();
        img.src = highQualityUrl;
        img.onload = () => {
          setBackgroundImage(img.src);
        };
      }
    }
  }, [currentTrack?.album?.images]);

  if (!currentTrack) return null;

  const artistNames = currentTrack?.artists
    ?.map((a: Artist) => a.name)
    .join(', ');

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center z-50 overflow-hidden">
      <div
        className="absolute inset-0 blur-[250px]"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          filter: 'blur(250px) brightness(100%)',
          WebkitFilter: 'blur(10000px) brightness(75%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <button
        onClick={onClose}
        className="absolute top-8 right-8 text-white/80 hover:text-white transition"
      >
        <RxCross2 size={24} className="text-white cursor-pointer" />
      </button>

      <div className="relative z-10 flex flex-col items-center max-w-screen-sm w-full px-4">
        <div className="w-[500px] h-[500px] mb-8">
          <img
            crossOrigin={'anonymous'}
            src={backgroundImage}
            alt={currentTrack?.name}
            className="album-art w-auto h-auto object-cover rounded-lg shadow-2xl"
          />
        </div>

        <div className="flex flex-col items-center gap-2 mb-4">
          <div
            className="marquee_container flex items-center"
            style={{ width: '500px' }}
          >
            <div
              ref={nameRef}
              className={`text-2xl font-extrabold text-neutral-100 whitespace-nowrap mx-auto
                ${isNameOverflowing ? 'marquee' : ''}`}
            >
              {currentTrack.name}
              {isNameOverflowing && (
                <>
                  <span className="mx-4">•</span>
                  {currentTrack.name}
                </>
              )}
            </div>
          </div>

          <div
            className="marquee_container flex items-center"
            style={{ width: '500px' }}
          >
            <div
              ref={artistsRef}
              className={`text-lg text-neutral-100 font-bold whitespace-nowrap mx-auto
                ${isArtistsOverflowing ? 'marquee' : ''}`}
            >
              {artistNames}
              {isArtistsOverflowing && (
                <>
                  <span className="mx-4">•</span>
                  {artistNames}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="w-[calc(100%-3rem)] flex items-center gap-2 mb-8">
          <span className="text-xs text-white/70 w-12 text-right font-medium">
            {formatTime(position)}
          </span>
          <div
            className="flex-1 h-[5px] bg-white/20 rounded-full overflow-hidden"
            onClick={onSeek}
          >
            <div
              className="h-full bg-neutral-200 rounded-full"
              style={{ width: `${(position / duration) * 100}%` }}
            />
          </div>
          <span className="text-xs text-white/70 font-medium w-12">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-8 mb-12">
          <button
            onClick={onPrevious}
            className="text-neutral-300 hover:text-white hover:scale-105 transition-all duration-150"
          >
            <IoPlaySkipBack size={24} />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-opacity-0 flex items-center justify-center hover:scale-105 transition-[0.3s]"
          >
            {isPlaying ? (
              <FaPause
                className="text-neutral-300 hover:text-white"
                size={45}
              />
            ) : (
              <FaPlay
                className="text-neutral-300 hover:text-white ml-1 focus:outline-none"
                size={40}
              />
            )}
          </button>

          <button
            onClick={onNext}
            className="text-neutral-300 hover:text-white hover:scale-105 transition-all duration-150"
          >
            <IoPlaySkipForward size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenPlayer;
