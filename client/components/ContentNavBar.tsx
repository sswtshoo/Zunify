import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  UserCircle,
  ChevronRight as ChevronRightMini,
} from 'lucide-react';
import Link from 'next/link';

interface ContentNavBarProps {
  type: 'playlist' | 'artist' | 'album';
  name: string;
}

const ContentNavBar = ({ type, name }: ContentNavBarProps) => {
  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  const handleForward = () => {
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'playlist':
        return 'Playlists';
      case 'artist':
        return 'Artists';
      case 'album':
        return 'Albums';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1) + 's';
    }
  };

  const getTypePath = (type: string) => {
    switch (type) {
      case 'playlist':
        return '/playlists';
      case 'artist':
        return '/artists';
      case 'album':
        return '/albums';
      default:
        return `/${type}s`;
    }
  };

  return (
    <div className="fixed flex items-center h-16 w-full px-6 z-40 backdrop-blur-md">
      <div className="flex items-center ml-4 text-white/80">
        <Link href={getTypePath(type)} className="hover:underline text-sm">
          {getTypeLabel(type)}
        </Link>
        <ChevronRightMini size={16} className="mx-2" />
        <span className="font-semibold text-sm">{name}</span>
      </div>
    </div>
  );
};

export default ContentNavBar;
