import { LocateFixed } from './icons/LocateFixed';

interface CenterOnMeButtonProps {
  disabled: boolean;
  hideOnMobile?: boolean;
  onClick: () => void;
  isFollowing?: boolean;
}

export function CenterOnMeButton({
  disabled,
  hideOnMobile = false,
  onClick,
  isFollowing = false
}: CenterOnMeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isFollowing ? 'Following current location' : 'Center map on current location'}
      aria-pressed={isFollowing}
      className={`absolute bottom-20 right-4 z-20 h-14 w-14 items-center justify-center rounded-full border text-white shadow-floating backdrop-blur transition-all duration-200 ease-out motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 sm:flex md:bottom-28 md:right-8 ${
        hideOnMobile ? 'hidden' : 'flex'
      } ${
        isFollowing
          ? 'animate-followBreath border-emerald-700/25 bg-emerald-600/90 shadow-followPulse hover:bg-emerald-500 motion-reduce:animate-none'
          : 'border-white/20 bg-slate-950/90 hover:bg-slate-900'
      }`}
    >
      <LocateFixed />
    </button>
  );
}
