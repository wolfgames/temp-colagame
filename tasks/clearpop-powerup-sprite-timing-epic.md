# ClearPop: Power-Up Sprite Timing

## Requirements

- Given a group of 5+ blocks is cleared and a power-up is spawned, should display the power-up sprite at the tap position immediately after the pop animation — before gravity and refill animations begin.
- Given a power-up sprite is displayed and gravity moves it to a lower row, should animate the sprite falling to its final position in sync with block gravity.
- Given a power-up is tapped for detonation, should remove the power-up sprite immediately before the detonation animation plays — not after the full animation sequence completes.
- Given two adjacent power-ups are tapped to trigger a combo, should remove both power-up sprites immediately after the combo anticipation animation.
