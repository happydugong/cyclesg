import { LocateFixed } from './icons/LocateFixed';

interface CenterOnMeButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export function CenterOnMeButton({ disabled, onClick }: CenterOnMeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Center map on current location"
      className="absolute bottom-28 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-slate-950/90 text-white shadow-floating backdrop-blur transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 md:bottom-8 md:right-8"
    >
      <LocateFixed />
    </button>
  );
}
