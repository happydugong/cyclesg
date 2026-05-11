import { LocateFixed } from './icons/LocateFixed';

interface CenterOnMeButtonProps {
  disabled: boolean;
  onClick: () => void;
  isRaised?: boolean;
}

export function CenterOnMeButton({
  disabled,
  onClick,
  isRaised = false
}: CenterOnMeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Center map on current location"
      className={`absolute right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-slate-950/90 text-white shadow-floating backdrop-blur transition-all duration-200 ease-out hover:bg-slate-900 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 md:bottom-12 md:right-8 ${
        isRaised ? 'bottom-52' : 'bottom-20'
      }`}
    >
      <LocateFixed />
    </button>
  );
}
