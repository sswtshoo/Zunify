import React from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoPlaySkipBack, IoPlaySkipForward } from 'react-icons/io5';
import { RxCross2 } from 'react-icons/rx';

interface FullscreenPlayerProps {
  currentTrack: any;
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

const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
  volume,
}: FullscreenPlayerProps) => {
  if (!currentTrack) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-neutral-950 to-black flex items-center justify-center z-50">
      <div
        className="absolute inset-0 opacity-60 blur-[120px]"
        style={{
          backgroundImage: `url(${currentTrack?.album?.images[2]?.url})`,
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
            src={currentTrack?.album?.images[2]?.url}
            alt={currentTrack?.name}
            className="w-auto h-auto object-cover rounded-lg shadow-2xl"
          />
        </div>

        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-neutral-100 mb-2">
            {currentTrack?.name}
          </h1>
          <p className="text-lg text-neutral-100">
            {currentTrack?.artists?.map((a: any) => a.name).join(', ')}
          </p>
        </div>

        <div className="w-[calc(100%-3rem)] flex items-center gap-2 mb-8">
          <span className="text-xs text-white/70 w-12 text-right font-bold">
            {formatTime(position)}
          </span>
          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-200 rounded-full"
              style={{ width: `${(position / duration) * 100}%` }}
              onClick={onSeek}
            />
          </div>
          <span className="text-xs text-white/70 font-bold w-12">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-8 mb-12">
          <button
            onClick={onPrevious}
            className="text-neutral-300 hover:text-white transition"
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
                className="text-neutral-300 hover:text-white ml-1"
                size={40}
              />
            )}
          </button>

          <button
            onClick={onNext}
            className="text-neutral-400 hover:text-white transition"
          >
            <IoPlaySkipForward size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenPlayer;
