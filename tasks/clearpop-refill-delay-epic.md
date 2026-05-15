# ClearPop Refill Delay Epic

## Requirements

- Given a cleared group that causes gravity movements, new cells should begin arriving from above at the same time existing blocks start falling — not after gravity completes.
- Given any board clear, the player should never wait more than one fall-duration (~280ms) to see new cells arrive after the pop animation.
- Given refill cells in a multi-row column, cells should start from staggered heights above the board (based on dropDistance) so they all travel the same distance and arrive simultaneously, rather than starting from the same position and traveling at wildly different speeds.
