import type { ControlDockPlacement } from '../services/preferences/preferences';
import { Layers } from './icons/Layers';
import { LocateFixed } from './icons/LocateFixed';
import { Settings } from './icons/Settings';

interface FloatingControlDockProps {
  isFollowing: boolean;
  isLayerPanelOpen: boolean;
  isPreferencesOpen: boolean;
  locationDisabled: boolean;
  onLayerClick: () => void;
  onLocationClick: () => void;
  onPreferencesClick: () => void;
  placement: ControlDockPlacement;
}

function getDockClassName(placement: ControlDockPlacement) {
  switch (placement) {
    case 'top':
      return 'control-dock-top flex-row';
    case 'bottom':
      return 'control-dock-bottom flex-row';
    case 'left-bottom':
      return 'control-dock-left-bottom flex-col';
    case 'right-bottom':
    default:
      return 'control-dock-right-bottom flex-col';
  }
}

const buttonClassName =
  'pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-slate-950/90 text-white shadow-floating backdrop-blur transition duration-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50';

export function FloatingControlDock({
  isFollowing,
  isLayerPanelOpen,
  isPreferencesOpen,
  locationDisabled,
  onLayerClick,
  onLocationClick,
  onPreferencesClick,
  placement
}: FloatingControlDockProps) {
  return (
    <div className={`control-dock ${getDockClassName(placement)}`}>
      <button
        type="button"
        onClick={onLayerClick}
        className={buttonClassName}
        aria-label={isLayerPanelOpen ? 'Close map layers' : 'Open map layers'}
        aria-pressed={isLayerPanelOpen}
      >
        <Layers />
      </button>
      <button
        type="button"
        onClick={onLocationClick}
        disabled={locationDisabled}
        aria-label={isFollowing ? 'Following current location' : 'Center map on current location'}
        aria-pressed={isFollowing}
        className={`${buttonClassName} ${
          isFollowing
            ? 'animate-followBreath border-emerald-700/25 bg-emerald-600/90 shadow-followPulse hover:bg-emerald-500 motion-reduce:animate-none'
            : ''
        }`}
      >
        <LocateFixed />
      </button>
      <button
        type="button"
        onClick={onPreferencesClick}
        className={buttonClassName}
        aria-label={isPreferencesOpen ? 'Close preferences' : 'Open preferences'}
        aria-pressed={isPreferencesOpen}
      >
        <Settings />
      </button>
    </div>
  );
}
