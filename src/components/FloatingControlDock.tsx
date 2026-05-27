import type { ControlDockPlacement } from '../services/preferences/preferences';
import { Layers } from './icons/Layers';
import { LocateFixed } from './icons/LocateFixed';
import { Settings } from './icons/Settings';

interface FloatingControlDockProps {
  hasSearchMarker: boolean;
  isFollowing: boolean;
  isLayerPanelOpen: boolean;
  isPreferencesOpen: boolean;
  isSearchVisible: boolean;
  locationDisabled: boolean;
  onLayerClick: () => void;
  onLocationClick: () => void;
  onPreferencesClick: () => void;
  onRemovePinClick: () => void;
  onSearchToggleClick: () => void;
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
  'pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border text-white backdrop-blur transition duration-200 disabled:cursor-not-allowed disabled:opacity-50';
const inactiveButtonClassName =
  'border-white/20 bg-slate-950/90 shadow-floating hover:bg-slate-900';
const activeButtonClassName =
  'border-emerald-700/25 bg-emerald-600/90 shadow-followPulse hover:bg-emerald-500';

function getButtonClassName(isActive = false) {
  return `${buttonClassName} ${isActive ? activeButtonClassName : inactiveButtonClassName}`;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function RemovePinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
      <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" strokeLinejoin="round" />
      <path d="M9 10h6" strokeLinecap="round" />
    </svg>
  );
}

export function FloatingControlDock({
  hasSearchMarker,
  isFollowing,
  isLayerPanelOpen,
  isPreferencesOpen,
  isSearchVisible,
  locationDisabled,
  onLayerClick,
  onLocationClick,
  onPreferencesClick,
  onRemovePinClick,
  onSearchToggleClick,
  placement
}: FloatingControlDockProps) {
  return (
    <div className={`control-dock ${getDockClassName(placement)}`}>
      {hasSearchMarker ? (
        <button
          type="button"
          onClick={onRemovePinClick}
          className={getButtonClassName()}
          aria-label="Remove pin"
        >
          <RemovePinIcon />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onSearchToggleClick}
        className={getButtonClassName(isSearchVisible)}
        aria-label={isSearchVisible ? 'Hide search' : 'Show search'}
        aria-pressed={isSearchVisible}
      >
        <SearchIcon />
      </button>
      <button
        type="button"
        onClick={onLayerClick}
        className={getButtonClassName()}
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
        className={`${getButtonClassName(isFollowing)} ${
          isFollowing ? 'animate-followBreath motion-reduce:animate-none' : ''
        }`}
      >
        <LocateFixed />
      </button>
      <button
        type="button"
        onClick={onPreferencesClick}
        className={getButtonClassName()}
        aria-label={isPreferencesOpen ? 'Close preferences' : 'Open preferences'}
        aria-pressed={isPreferencesOpen}
      >
        <Settings />
      </button>
    </div>
  );
}
