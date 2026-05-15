import { createSignal, createEffect, onMount, onCleanup, Show } from 'solid-js';
import gsap from 'gsap';
import { useAudio } from '~/core/systems/audio';
import { useGameConfig } from '@wolfgames/components/solid';
import gearIcon from './assets/icon_gear.svg';
import soundMusic2Icon from './assets/icon_sound_music2.svg';
import soundMusic2MutedIcon from './assets/icon_sound_music2_muted.svg';
import volumeHighIcon from './assets/icon_volume_high.svg';
import volumeMediumIcon from './assets/icon_volume_medium.svg';
import volumeLowIcon from './assets/icon_volume_low.svg';
import volumeMutedIcon from './assets/icon_volume_muted.svg';
import trashIcon from './assets/icon_trash.svg';

// Settings Menu Configuration
const SETTINGS_CONFIG = {
  showVolumeSlider: true,
  showMusicToggle: true,
  backgroundColor: 'rgb(23,23,23)',
  borderRadius: '26px',
};

export interface SettingsMenuProps {
  /** Callback to reset progress (shows reset button when provided) */
  onResetProgress?: () => void;
  /** Callback when audio settings change (volume, mute) */
  onAudioSettingChanged?: (params: {
    setting_type: string;
    old_value: unknown;
    new_value: unknown;
    screen_name: string;
  }) => void;
}

interface StatusNotificationProps {
  message: string;
  onClose: () => void;
}

function StatusNotification(props: StatusNotificationProps) {
  let notificationRef: HTMLDivElement | undefined;

  onMount(() => {
    if (notificationRef) {
      gsap.fromTo(
        notificationRef,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );

      const timer = setTimeout(() => {
        if (notificationRef) {
          gsap.to(notificationRef, {
            opacity: 0,
            y: -10,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: props.onClose,
          });
        }
      }, 1700);

      onCleanup(() => clearTimeout(timer));
    }
  });

  return (
    <div
      ref={notificationRef}
      class="absolute left-[calc(50%-150px)] -translate-x-1/2 top-[10px] bg-black/70 text-white px-3 py-2 rounded-xl text-sm font-bold uppercase tracking-wider z-[9999] pointer-events-none whitespace-nowrap"
    >
      {props.message}
    </div>
  );
}

export default function SettingsMenu(props: SettingsMenuProps = {}) {
  const audio = useAudio();
  const config = useGameConfig();

  const [isOpen, setIsOpen] = createSignal(false);
  const [statusMessage, setStatusMessage] = createSignal('');
  const [showStatus, setShowStatus] = createSignal(false);
  const [isClosing, setIsClosing] = createSignal(false);

  let menuBgRef: HTMLDivElement | undefined;
  let menuPanelRef: HTMLDivElement | undefined;

  const toggleMenu = () => {
    if (isOpen()) {
      setIsClosing(true);

      if (menuPanelRef) {
        gsap.to(menuPanelRef, {
          opacity: 0,
          scale: 0.2,
          duration: 0.15,
          ease: 'power2.in',
        });
      }

      if (menuBgRef) {
        gsap.to(menuBgRef, {
          opacity: 0,
          duration: 0.15,
          ease: 'power2.in',
        });
      }

      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 150);
    } else {
      setIsOpen(true);
    }
  };

  createEffect(() => {
    if (isOpen() && !isClosing()) {
      if (menuPanelRef) {
        gsap.fromTo(
          menuPanelRef,
          { opacity: 0, scale: 0.2 },
          { opacity: 1, scale: 1, duration: 0.15, ease: 'power2.out' }
        );
      }

      if (menuBgRef) {
        gsap.fromTo(
          menuBgRef,
          { opacity: 0 },
          { opacity: 1, duration: 0.15, ease: 'power2.out' }
        );
      }
    }
  });

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Element;
    if (
      isOpen() &&
      !isClosing() &&
      !target.closest('.settings-panel') &&
      !target.closest('.settings-icon')
    ) {
      setIsClosing(true);

      if (menuPanelRef) {
        gsap.to(menuPanelRef, {
          opacity: 0,
          scale: 0.2,
          duration: 0.15,
          ease: 'power2.in',
        });
      }

      if (menuBgRef) {
        gsap.to(menuBgRef, {
          opacity: 0,
          duration: 0.15,
          ease: 'power2.in',
        });
      }

      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 150);
    }
  };

  createEffect(() => {
    if (isOpen()) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside);
    });
  });

  const showStatusNotification = (message: string) => {
    setStatusMessage(message);
    setShowStatus(true);
  };

  const handleMusicToggle = () => {
    const oldValue = audio.musicEnabled();
    audio.toggleMusic();
    const newValue = !oldValue;
    const status = newValue ? 'MUSIC ON' : 'MUSIC OFF';
    showStatusNotification(status);
    props.onAudioSettingChanged?.({
      setting_type: 'mute',
      old_value: oldValue,
      new_value: newValue,
      screen_name: 'settings_menu',
    });
  };

  // Debounce volume tracking to avoid spamming during slider drag
  let volumeTrackTimer: ReturnType<typeof setTimeout> | null = null;
  let volumeBeforeDrag = audio.volume();

  const handleVolumeChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const newVolume = parseFloat(target.value);
    audio.setVolume(newVolume);

    if (volumeTrackTimer) clearTimeout(volumeTrackTimer);
    volumeTrackTimer = setTimeout(() => {
      props.onAudioSettingChanged?.({
        setting_type: 'volume',
        old_value: volumeBeforeDrag,
        new_value: newVolume,
        screen_name: 'settings_menu',
      });
      volumeBeforeDrag = newVolume;
    }, 300);
  };

  const handleResetProgress = () => {
    if (props.onResetProgress) {
      props.onResetProgress();
      showStatusNotification('PROGRESS RESET');
      // Close menu after reset
      toggleMenu();
    }
  };

  const getVolumeIcon = () => {
    const v = audio.volume();
    if (v === 0) return volumeMutedIcon;
    if (v < 0.33) return volumeLowIcon;
    if (v < 0.66) return volumeMediumIcon;
    return volumeHighIcon;
  };

  return (
    <div class="relative inline-block">
      <Show when={showStatus()}>
        <StatusNotification
          message={statusMessage()}
          onClose={() => setShowStatus(false)}
        />
      </Show>

      <div class="relative">
        <div
          ref={menuBgRef}
          class="absolute top-[50%] right-0 left-0 h-[calc(100%+20px)] overflow-hidden"
          style={{
            'z-index': -1,
            opacity: 0,
            visibility: isOpen() ? 'visible' : 'hidden',
          }}
        >
          <div
            class="w-full h-full"
            style={{
              background: `linear-gradient(to bottom, ${SETTINGS_CONFIG.backgroundColor} 70%, transparent 100%)`,
            }}
          />
        </div>

        <button
          class="settings-icon border-none cursor-pointer p-2 rounded-full transition-all duration-150"
          style={{
            'background-color': isOpen() ? SETTINGS_CONFIG.backgroundColor : 'transparent',
          }}
          onClick={toggleMenu}
        >
          <img
            src={gearIcon}
            alt="Settings"
            width={28}
            height={28}
            class="filter-none"
          />
        </button>
      </div>

      <div
        ref={menuPanelRef}
        class="settings-panel absolute right-0 top-[calc(100%+10px)] shadow-lg p-3 sm:p-4 w-95 max-w-[calc(100vw-1rem)] text-white"
        style={{
          'transform-origin': 'top right',
          opacity: 0,
          scale: 0.2,
          visibility: isOpen() ? 'visible' : 'hidden',
          'background-color': SETTINGS_CONFIG.backgroundColor,
          'border-radius': SETTINGS_CONFIG.borderRadius,
        }}
      >
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2 sm:gap-3 justify-between w-full flex-wrap sm:flex-nowrap">
            <Show when={SETTINGS_CONFIG.showVolumeSlider}>
              <div class="relative h-11 sm:h-15 grow min-w-30">
                <div class="absolute inset-0 bg-[rgb(60,60,60)] rounded-xl overflow-hidden">
                  <div
                    class="absolute top-0 left-0 h-full bg-white"
                    style={{ width: `${audio.volume() * 100}%` }}
                  />
                </div>

                <div
                  class="absolute top-1/2 transform -translate-y-1/2 pointer-events-none"
                  style={{
                    'z-index': 999,
                    left: audio.volume() < 0.33 && audio.volume() > 0 ? '9px' : '14px',
                  }}
                >
                  <img
                    src={getVolumeIcon()}
                    alt="Volume"
                    class={audio.volume() === 0 ? 'invert' : 'brightness-0'}
                    style={
                      audio.volume() === 0
                        ? { width: '28px', height: '28px' }
                        : { width: '32px', height: '32px' }
                    }
                  />
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audio.volume()}
                  onInput={handleVolumeChange}
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ 'z-index': 100 }}
                />
              </div>
            </Show>

            <Show when={SETTINGS_CONFIG.showMusicToggle}>
              <button
                class={`h-11 w-11 sm:h-15 sm:w-15 shrink-0 flex items-center justify-center rounded-xl transition-colors duration-150 ${
                  !audio.musicEnabled() ? 'bg-[rgb(60,60,60)]' : 'bg-white'
                }`}
                onClick={handleMusicToggle}
                aria-label={!audio.musicEnabled() ? 'Unmute Music' : 'Mute Music'}
              >
                <img
                  src={!audio.musicEnabled() ? soundMusic2MutedIcon : soundMusic2Icon}
                  alt={!audio.musicEnabled() ? 'Music Muted' : 'Music On'}
                  class="w-6 h-6"
                />
              </button>
            </Show>

            <Show when={props.onResetProgress}>
              <button
                class="h-11 w-11 sm:h-15 sm:w-15 shrink-0 flex items-center justify-center rounded-xl transition-colors duration-150 bg-[rgb(60,60,60)] hover:bg-red-600"
                onClick={handleResetProgress}
                aria-label="Reset Progress"
              >
                <img
                  src={trashIcon}
                  alt="Reset Progress"
                  class="w-6 h-6 invert"
                />
              </button>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
