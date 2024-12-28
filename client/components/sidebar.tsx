import { twMerge } from 'tailwind-merge';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  House,
  HeartStraight,
  MicrophoneStage,
  VinylRecord,
  Playlist,
  MagnifyingGlass,
} from '@phosphor-icons/react';

interface SidebarProps {
  className?: string;
}

const usePathName = () => {
  const router = useRouter();
  return router.pathname;
};

export default function Sidebar({ className }: SidebarProps) {
  const pathName = usePathName();
  const sidebarClass =
    'flex items-center gap-x-2 cursor-pointer text-neutral-400 font-bold hover:text-white hover:scale-110 [transition:all_0.3s_ease-in] py-3 px-2 rounded-lg';

  const clickedClass =
    'font-extrabold text-lemon opacity-100 transition-all duration-300 bg-darkorange text-lemon hover:text-lemon';

  return (
    <div
      className={twMerge(
        'font-medium h-full bg-[rgba(0,0,0,0)] overflow-auto',
        className
      )}
    >
      <div className=" homeAndLib px-2 mx-4 mt-16  py-4">
        <Link
          href="/"
          className={twMerge(sidebarClass, pathName === '/' && clickedClass)}
        >
          <House size={16} weight="bold" />
          <p className="text-base leading-none">Home</p>
        </Link>

        <Link
          href="/search"
          className={twMerge(
            sidebarClass,
            pathName === '/search' && clickedClass
          )}
        >
          <MagnifyingGlass size={16} weight="bold" />
          <p className="text-base leading-none">Search</p>
        </Link>
      </div>

      <div className="library px-6 pt-12">
        <Link
          href="/artists"
          className={twMerge(
            sidebarClass,
            pathName === '/artists' && clickedClass
          )}
        >
          <MicrophoneStage size={16} weight="bold" />
          <p className="text-base leading-none">Artists</p>
        </Link>
        <Link
          href="/albums"
          className={twMerge(
            sidebarClass,
            pathName === '/albums' && clickedClass
          )}
        >
          <VinylRecord size={16} weight="bold" />
          <p className="text-base leading-none">Albums</p>
        </Link>
        <Link
          href="/songs"
          className={twMerge(
            sidebarClass,
            pathName === '/songs' && clickedClass
          )}
        >
          <HeartStraight size={16} weight="bold" />
          <p className="text-base leading-none">Liked Songs</p>
        </Link>
        <Link
          href="/playlists"
          className={twMerge(
            sidebarClass,
            pathName === '/playlists' && clickedClass
          )}
        >
          <Playlist size={16} weight="bold" />
          <p className="text-base leading-none">All Playlists</p>
        </Link>
      </div>
    </div>
  );
}
