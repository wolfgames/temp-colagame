/**
 * Drag-Drop Interaction Archetype -- React/JS Patterns
 *
 * This file contains the definitive patterns for drag-drop interaction.
 * DO NOT rewrite these patterns from scratch.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ LOCKED vs ADAPTABLE                                            │
 * │                                                                │
 * │ LOCKED -- do not change values, logic, or structure:           │
 * │   - Drag starts on pointerdown (immediate, no threshold)       │
 * │   - Ghost follows pointer with original click offset preserved │
 * │   - Drop targets highlight during drag (green glow)            │
 * │   - Valid drop: 200ms ease-out settle                          │
 * │   - Invalid drop: 200ms snap-back                              │
 * │   - Double-tap auto-move to best valid target                  │
 * │   - Z-index elevation during drag (z-index: 100/1000)         │
 * │   - Pointer capture via setPointerCapture                      │
 * │   - pointInRect() logic                                        │
 * │   - findDropTarget() scan logic                                │
 * │   - Ghost shadow/scale styling                                 │
 * │   - Source dims to opacity 0.3 during drag                     │
 * │   - Animation timing constants                                 │
 * │                                                                │
 * │ ADAPTABLE -- change only where marked // ADAPT:                │
 * │   - Piece/card types (your Card, Piece, Token types)           │
 * │   - Drop validation rules (your canDrop logic)                 │
 * │   - Layout dimensions (CARD_WIDTH, CARD_HEIGHT, STACK_OFFSET)  │
 * │   - Pile structure (tableau, foundations, hand, zones)          │
 * │   - Store/state API calls (move/validate/setState)             │
 * │   - Visual style of pieces                                     │
 * │   - Board layout and zone positions                            │
 * │                                                                │
 * │ If you find an improvement, do NOT apply it in the game.       │
 * │ Note it for archetype evolution instead.                       │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Each section is independent -- copy what you need.
 */

import React, { useState, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════ */

const CARD_WIDTH = 70;    // ADAPT: match your piece width
const CARD_HEIGHT = 100;  // ADAPT: match your piece height
const STACK_OFFSET = 25;  // ADAPT: vertical offset between stacked cards

/* ── Animation timing (LOCKED) ────────────────────────────────────────── */
const SETTLE_MS = 200;          // valid drop settle
const SNAPBACK_MS = 200;        // invalid drop snap-back
const FLIP_MS = 300;            // card flip (150ms out + 150ms in)
const SCORE_FLOAT_MS = 800;     // score popup float
const CELEBRATION_MS = 600;     // win celebration pop
const DOUBLE_TAP_WINDOW = 300;  // ms between taps for double-tap detection

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: replace with your game's piece/card type
type Piece = {
  id: string;
  [key: string]: any;
};

// ADAPT: replace with your game's source/target identifiers
type DragSource = {
  pileType: string;   // ADAPT: e.g. "tableau" | "waste" | "hand" | "board"
  pileIndex: number;
  cardIndex: number;
};

type DropTarget = {
  pileType: string;   // ADAPT: e.g. "tableau" | "foundation" | "board"
  pileIndex: number;
};

type DragState = {
  source: DragSource;
  pieces: Piece[];          // the piece(s) being dragged
  offsetX: number;          // click offset within the piece
  offsetY: number;
  pointerX: number;         // current pointer position
  pointerY: number;
};

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: HIT TEST HELPERS (LOCKED)
 *
 * Pure geometry functions. Use as-is.
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Check if a point is inside a rectangle.
 */
function pointInRect(px: number, py: number, rect: Rect): boolean {
  return (
    px >= rect.left &&
    px <= rect.left + rect.width &&
    py >= rect.top &&
    py <= rect.top + rect.height
  );
}

/**
 * Find the drop target under the pointer by scanning all registered zones.
 * Uses data-pile attributes on DOM elements to identify targets.
 *
 * Returns the target identifier or null if pointer is not over any valid zone.
 */
function findDropTarget(
  pointerX: number,
  pointerY: number,
  pileElements: HTMLElement[],
): DropTarget | null {
  for (const el of pileElements) {
    const rect = el.getBoundingClientRect();
    if (pointInRect(pointerX, pointerY, rect)) {
      const pileAttr = el.getAttribute("data-pile");
      if (!pileAttr) continue;
      const [pileType, pileIndexStr] = pileAttr.split("-");
      return { pileType, pileIndex: parseInt(pileIndexStr, 10) };
    }
  }
  return null;
}

/**
 * Query all drop target elements from the DOM.
 * Elements must have a data-pile="type-index" attribute.
 */
function getAllDropTargets(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-pile]"));
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: DRAG LIFECYCLE (Pointer Events)
 *
 * Wire onPointerDown onto draggable pieces.
 * Wire onPointerMove and onPointerUp onto the board container or window.
 * The board element needs: touch-action: none; user-select: none;
 * ═══════════════════════════════════════════════════════════════════════ */

function DragLifecyclePattern() {
  // ADAPT: replace with your game state and types
  const [gameState, setGameState] = useState<any>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);
  const [animating, setAnimating] = useState(false);
  const lastTapRef = useRef<{ source: DragSource; time: number } | null>(null);

  const isInputBlocked = () => {
    // ADAPT: check your game's phase/animation state
    return animating;
  };

  /* ── Pointer Down: Start drag immediately ──────────────────────────── */
  const handlePointerDown = useCallback(
    (source: DragSource, e: React.PointerEvent) => {
      if (isInputBlocked()) return;

      // ADAPT: get the piece(s) from your game state
      // const pieces = getPieces(gameState, source);
      const pieces: Piece[] = []; // placeholder
      if (pieces.length === 0) return;

      // ── Double-tap detection ──────────────────────────────────────
      const now = Date.now();
      const lastTap = lastTapRef.current;
      if (
        lastTap &&
        lastTap.source.pileType === source.pileType &&
        lastTap.source.pileIndex === source.pileIndex &&
        lastTap.source.cardIndex === source.cardIndex &&
        now - lastTap.time < DOUBLE_TAP_WINDOW
      ) {
        lastTapRef.current = null;
        handleDoubleTap(source);
        return;
      }
      lastTapRef.current = { source, time: now };

      // Calculate click offset within the piece element
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      // Capture pointer for reliable tracking across elements
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setDragState({
        source,
        pieces,
        offsetX,
        offsetY,
        pointerX: e.clientX,
        pointerY: e.clientY,
      });
    },
    [gameState, animating],
  );

  /* ── Pointer Move: Update ghost position + find hover target ───────── */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;

      const pointerX = e.clientX;
      const pointerY = e.clientY;

      // Update ghost position
      setDragState((prev) =>
        prev ? { ...prev, pointerX, pointerY } : null,
      );

      // Find drop target under pointer
      const targets = getAllDropTargets();
      const target = findDropTarget(pointerX, pointerY, targets);

      if (target) {
        // ADAPT: validate if drop is allowed using your game rules
        // const isValid = canDrop(gameState, dragState.pieces, target, dragState.source);
        const isValid = true; // placeholder
        setHoverTarget(isValid ? target : null);
      } else {
        setHoverTarget(null);
      }
    },
    [dragState, gameState],
  );

  /* ── Pointer Up: Resolve drop or snap back ─────────────────────────── */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;

      const targets = getAllDropTargets();
      const target = findDropTarget(e.clientX, e.clientY, targets);

      if (target && hoverTarget) {
        // Valid drop -- apply the move
        // ADAPT: call your game's move function
        // const nextState = applyMove(gameState, dragState.source, target);
        // setGameState(nextState);

        // Play settle animation
        setAnimating(true);
        setTimeout(() => setAnimating(false), SETTLE_MS);
      } else {
        // Invalid drop or dropped outside any target -- snap back
        setAnimating(true);
        setTimeout(() => setAnimating(false), SNAPBACK_MS);
      }

      setDragState(null);
      setHoverTarget(null);
    },
    [dragState, hoverTarget, gameState],
  );

  /* ── Double-tap: auto-move to best valid target ────────────────────── */
  const handleDoubleTap = (source: DragSource) => {
    if (isInputBlocked()) return;

    // ADAPT: get pieces and find best target using your game rules
    // const pieces = getPieces(gameState, source);
    // const target = findBestTarget(gameState, pieces, source);
    // if (target) {
    //   const nextState = applyMove(gameState, source, target);
    //   setGameState(nextState);
    //   setAnimating(true);
    //   setTimeout(() => setAnimating(false), SETTLE_MS);
    // }
  };

  return null; // placeholder
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: GHOST OVERLAY RENDERING (LOCKED)
 *
 * Render this inside your board container.
 * The ghost follows the pointer using fixed positioning.
 * ═══════════════════════════════════════════════════════════════════════ */

function GhostOverlayPattern({ dragState }: { dragState: DragState | null }) {
  if (!dragState) return null;

  return (
    <div
      className="drag-overlay"
      style={{
        position: "fixed",
        left: dragState.pointerX - dragState.offsetX,
        top: dragState.pointerY - dragState.offsetY,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {dragState.pieces.map((piece, i) => (
        // ADAPT: replace with your piece rendering component
        <div
          key={piece.id}
          className="drag-ghost"
          style={{
            position: "absolute",
            top: i * STACK_OFFSET,  // ADAPT: stacking layout for your pieces
            width: CARD_WIDTH,      // ADAPT: piece dimensions
            height: CARD_HEIGHT,
            zIndex: 100 + i,
          }}
        >
          {/* ADAPT: render your piece/card content here */}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 6: SOURCE DIMMING DURING DRAG (LOCKED)
 *
 * In your piece render loop, apply opacity: 0.3 to pieces being dragged.
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Check if a piece at a given position is currently being dragged.
 * If so, render it dimmed (opacity: 0.3) so the ghost appears to lift off.
 */
function isDraggedFrom(
  dragState: DragState | null,
  pileType: string,
  pileIndex: number,
  cardIndex?: number,
): boolean {
  if (!dragState) return false;
  const src = dragState.source;
  if (src.pileType !== pileType || src.pileIndex !== pileIndex) return false;
  if (cardIndex !== undefined) return src.cardIndex <= cardIndex;
  return true;
}

// In your piece style:
//   opacity: isDraggedFrom(dragState, "tableau", colIdx, cardIdx) ? 0.3 : 1

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 7: DROP ZONE HIGHLIGHTING (LOCKED)
 *
 * In your drop zone render loop, apply the "drop-glow" class when
 * the zone matches the current hoverTarget.
 * ═══════════════════════════════════════════════════════════════════════ */

function isDropHighlighted(
  hoverTarget: DropTarget | null,
  pileType: string,
  pileIndex: number,
): boolean {
  return (
    hoverTarget !== null &&
    hoverTarget.pileType === pileType &&
    hoverTarget.pileIndex === pileIndex
  );
}

// In your drop zone className:
//   className={`pile ${isDropHighlighted(hoverTarget, "foundation", fi) ? "drop-glow" : ""}`}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 8: canDrop() -- GENERIC VALIDATION PATTERN
 *
 * Validates whether a set of pieces can be dropped on a target.
 * The body is ADAPTABLE -- replace with your game's rules.
 * The signature and guard structure are LOCKED.
 * ═══════════════════════════════════════════════════════════════════════ */

function canDrop(
  gameState: any,       // ADAPT: your game state type
  pieces: Piece[],      // ADAPT: your piece type
  target: DropTarget,
  source: DragSource,
): boolean {
  if (pieces.length === 0) return false;

  // ADAPT: all rule logic below -- replace with your game's drop rules
  // Example for a card game (solitaire-style):
  //
  // const topPiece = pieces[0];
  //
  // if (target.pileType === "foundation") {
  //   if (pieces.length !== 1) return false;
  //   const pile = gameState.foundations[target.pileIndex];
  //   if (pile.length === 0) return topPiece.rank === "A";
  //   const top = pile[pile.length - 1];
  //   return top.suit === topPiece.suit && topPiece.value === top.value + 1;
  // }
  //
  // if (target.pileType === "tableau") {
  //   const col = gameState.tableau[target.pileIndex];
  //   if (col.length === 0) return topPiece.rank === "K";
  //   const top = col[col.length - 1];
  //   return isAlternateColor(topPiece, top) && topPiece.value === top.value - 1;
  // }

  return false;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 9: applyDrop() -- MOVE EXECUTION PATTERN
 *
 * Moves pieces from source to target in the game state.
 * The body is ADAPTABLE -- replace with your game's state mutations.
 * The signature and deep-copy principle are LOCKED.
 * ═══════════════════════════════════════════════════════════════════════ */

function applyDrop(
  gameState: any,       // ADAPT: your game state type
  source: DragSource,
  target: DropTarget,
): any {                // ADAPT: return your game state type
  // LOCKED: always deep-copy state before mutating
  const next = structuredClone(gameState);

  // ADAPT: remove pieces from source pile
  // if (source.pileType === "tableau") {
  //   const removed = next.tableau[source.pileIndex].splice(source.cardIndex);
  //   // Flip newly exposed card if needed
  //   const col = next.tableau[source.pileIndex];
  //   if (col.length > 0 && !col[col.length - 1].faceUp) {
  //     col[col.length - 1].faceUp = true;
  //   }
  // }

  // ADAPT: add pieces to target pile
  // if (target.pileType === "foundation") {
  //   next.foundations[target.pileIndex].push(...removed);
  // } else if (target.pileType === "tableau") {
  //   next.tableau[target.pileIndex].push(...removed);
  // }

  // ADAPT: update score, move count, etc.
  // next.moves++;

  return next;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 10: SNAP-BACK ON INVALID DROP (LOCKED)
 *
 * When a drop is invalid, the ghost animates back to the source position.
 * Use CSS custom properties --snap-dx and --snap-dy to define the vector.
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Compute the snap-back vector from the current ghost position
 * to the source element's position.
 */
function computeSnapBack(
  dragState: DragState,
  sourceElement: HTMLElement,
): { dx: number; dy: number } {
  const rect = sourceElement.getBoundingClientRect();
  const ghostX = dragState.pointerX - dragState.offsetX;
  const ghostY = dragState.pointerY - dragState.offsetY;
  return {
    dx: ghostX - rect.left,
    dy: ghostY - rect.top,
  };
}

// Apply to the source element after clearing dragState:
//   el.style.setProperty("--snap-dx", `${snap.dx}px`);
//   el.style.setProperty("--snap-dy", `${snap.dy}px`);
//   el.classList.add("snap-back");
//   setTimeout(() => el.classList.remove("snap-back"), SNAPBACK_MS);

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 11: DOUBLE-TAP AUTO-MOVE (LOCKED)
 *
 * When a piece is double-tapped (two taps within DOUBLE_TAP_WINDOW ms),
 * auto-move it to the best valid target.
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Find the best valid drop target for auto-move.
 * Scans targets in priority order (e.g., foundations before tableau).
 */
function findBestAutoTarget(
  gameState: any,       // ADAPT: your game state type
  pieces: Piece[],      // ADAPT: your piece type
  source: DragSource,
  targetPriority: DropTarget[], // ADAPT: ordered list of targets to try
): DropTarget | null {
  for (const target of targetPriority) {
    if (canDrop(gameState, pieces, target, source)) {
      return target;
    }
  }
  return null;
}

// ADAPT: build your priority list, e.g.:
// const targets: DropTarget[] = [
//   ...foundations.map((_, i) => ({ pileType: "foundation", pileIndex: i })),
//   ...tableau.map((_, i) => ({ pileType: "tableau", pileIndex: i })),
// ];

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 12: CARD FLIP ANIMATION HELPER
 *
 * Two-phase flip: first half rotates to 90deg (hides face),
 * then swap the face content, second half rotates back to 0deg.
 * ═══════════════════════════════════════════════════════════════════════ */

function flipCard(
  element: HTMLElement,
  onMidpoint: () => void, // called at the halfway point to swap face/back
): void {
  element.classList.add("card-flip-out");

  const halfDuration = FLIP_MS / 2; // 150ms

  setTimeout(() => {
    element.classList.remove("card-flip-out");
    onMidpoint(); // ADAPT: update your card's faceUp state here
    element.classList.add("card-flip-in");

    setTimeout(() => {
      element.classList.remove("card-flip-in");
    }, halfDuration);
  }, halfDuration);
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 13: SCORE FLOAT HELPER
 *
 * Shows a floating "+N" above a position, then fades out.
 * ═══════════════════════════════════════════════════════════════════════ */

function showScoreFloat(
  container: HTMLElement,
  x: number,
  y: number,
  points: number,
): void {
  const el = document.createElement("div");
  el.className = "score-float";
  el.textContent = points > 0 ? `+${points}` : `${points}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  container.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, SCORE_FLOAT_MS);
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 14: FULL WIRING EXAMPLE
 *
 * Shows how all the pieces connect in a React component.
 * This is a reference -- ADAPT the entire component to your game.
 * ═══════════════════════════════════════════════════════════════════════ */

function FullWiringExample() {
  const [gameState, setGameState] = useState<any>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);
  const [animating, setAnimating] = useState(false);
  const lastTapRef = useRef<{ source: DragSource; time: number } | null>(null);

  const handlePointerDown = useCallback(
    (source: DragSource, e: React.PointerEvent) => {
      if (animating) return;

      // ADAPT: get pieces from your state
      const pieces: Piece[] = [];
      if (pieces.length === 0) return;

      // Double-tap check
      const now = Date.now();
      const last = lastTapRef.current;
      if (
        last &&
        last.source.pileType === source.pileType &&
        last.source.pileIndex === source.pileIndex &&
        last.source.cardIndex === source.cardIndex &&
        now - last.time < DOUBLE_TAP_WINDOW
      ) {
        lastTapRef.current = null;
        // ADAPT: auto-move logic
        return;
      }
      lastTapRef.current = { source, time: now };

      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setDragState({
        source,
        pieces,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        pointerX: e.clientX,
        pointerY: e.clientY,
      });
    },
    [gameState, animating],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      setDragState((prev) =>
        prev
          ? { ...prev, pointerX: e.clientX, pointerY: e.clientY }
          : null,
      );
      const targets = getAllDropTargets();
      const target = findDropTarget(e.clientX, e.clientY, targets);
      if (target) {
        // ADAPT: validate with your rules
        const valid = canDrop(gameState, dragState.pieces, target, dragState.source);
        setHoverTarget(valid ? target : null);
      } else {
        setHoverTarget(null);
      }
    },
    [dragState, gameState],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      const targets = getAllDropTargets();
      const target = findDropTarget(e.clientX, e.clientY, targets);

      if (target && hoverTarget) {
        // ADAPT: apply move
        const nextState = applyDrop(gameState, dragState.source, target);
        setGameState(nextState);
        setAnimating(true);
        setTimeout(() => setAnimating(false), SETTLE_MS);
      } else {
        // Snap back -- animation plays via CSS class
        setAnimating(true);
        setTimeout(() => setAnimating(false), SNAPBACK_MS);
      }

      setDragState(null);
      setHoverTarget(null);
    },
    [dragState, hoverTarget, gameState],
  );

  return (
    <div
      style={{ touchAction: "none", userSelect: "none", position: "relative" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* ADAPT: render your board/piles here */}
      {/* Each draggable piece gets onPointerDown={e => handlePointerDown(source, e)} */}
      {/* Each drop zone gets data-pile="type-index" attribute */}
      {/* Apply drop-glow class: isDropHighlighted(hoverTarget, type, index) */}
      {/* Apply dim style: isDraggedFrom(dragState, type, pileIdx, cardIdx) ? 0.3 : 1 */}

      {/* Ghost overlay */}
      <GhostOverlayPattern dragState={dragState} />
    </div>
  );
}
