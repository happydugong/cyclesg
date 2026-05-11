import { LocateFixed } from './icons/LocateFixed';

interface CenterOnMeButtonProps {
  disabled: boolean;
  onClick: () => void;
  isRaised?: boolean;
  isFollowing?: boolean;
}

export function CenterOnMeButton({
  disabled,
  onClick,
  isRaised = false,
  isFollowing = false
}: CenterOnMeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isFollowing ? 'Following current location' : 'Center map on current location'}
      aria-pressed={isFollowing}
      className={`absolute right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full border text-white shadow-floating backdrop-blur transition-all duration-200 ease-out motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 md:bottom-12 md:right-8 ${
        isFollowing
          ? 'animate-followBreath border-emerald-700/25 bg-emerald-600/90 shadow-followPulse hover:bg-emerald-500 motion-reduce:animate-none'
          : 'border-white/20 bg-slate-950/90 hover:bg-slate-900'
      } ${
        isRaised ? 'bottom-52' : 'bottom-20'
      }`}
    >
      <LocateFixed />
    </button>
  );
}
