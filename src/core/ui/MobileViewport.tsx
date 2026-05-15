import { createSignal, onMount, onCleanup, Show, type JSX } from 'solid-js';

interface MobileViewportProps {
  children: JSX.Element;
  /** Aspect ratio as width/height (default: 9/16 for portrait mobile) */
  aspectRatio?: number;
  /** Max width on desktop in pixels (default: 430 - iPhone 14 Pro Max width) */
  maxWidth?: number;
  /** Background color outside the viewport (default: #1a1a1a) */
  backgroundColor?: string;
  /** Show device frame on desktop (default: true) */
  showFrame?: boolean;
}

/**
 * Constrains content to mobile viewport dimensions on desktop browsers.
 * On actual mobile devices, renders full screen.
 *
 * @example
 * ```tsx
 * <MobileViewport>
 *   <App />
 * </MobileViewport>
 * ```
 */
export function MobileViewport(props: MobileViewportProps) {
  // Default to false (desktop) so constraint shows immediately on desktop
  const [isMobile, setIsMobile] = createSignal(false);

  const aspectRatio = () => props.aspectRatio ?? 9 / 16;
  const maxWidth = () => props.maxWidth ?? 430;
  const backgroundColor = () => props.backgroundColor ?? '#1a1a1a';
  const showFrame = () => props.showFrame ?? true;

  const checkMobile = () => {
    // Consider mobile if touch device OR narrow viewport
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isNarrowViewport = window.innerWidth <= 768;
    setIsMobile(isTouchDevice || isNarrowViewport);
  };

  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    onCleanup(() => window.removeEventListener('resize', checkMobile));
  });

  return (
    <Show
      when={!isMobile()}
      fallback={<>{props.children}</>}
    >
      {/* Desktop: constrain to mobile viewport */}
      <div
        class="fixed inset-0 flex items-center justify-center"
        style={{ "background-color": backgroundColor() }}
      >
        <div
          class="relative overflow-hidden"
          style={{
            width: `min(${maxWidth()}px, calc(100vh * ${aspectRatio()}))`,
            height: `min(100vh, calc(${maxWidth()}px / ${aspectRatio()}))`,
            "max-width": `${maxWidth()}px`,
            "border-radius": showFrame() ? "24px" : "0",
            "box-shadow": showFrame() ? "0 0 0 8px #333, 0 25px 50px -12px rgba(0,0,0,0.5)" : "none",
            // Create containing block for fixed-position children
            transform: "translateZ(0)",
          }}
        >
          {props.children}
        </div>
      </div>
    </Show>
  );
}
