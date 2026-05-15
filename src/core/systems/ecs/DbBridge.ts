/**
 * ECS Database Bridge
 *
 * Exposes the active game's ECS database to the Inspector panel.
 * Games call setActiveDb(db) on create and setActiveDb(null) on destroy.
 * app.tsx reads activeDb() to pass to the Inspector component.
 */
import { createSignal, createRoot } from 'solid-js';
import type { Database } from '@adobe/data/ecs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = Database<any, any, any, any, any, any, any, any>;

const [activeDb, setActiveDb] = createRoot(() => {
  return createSignal<AnyDatabase | null>(null);
});

export { activeDb, setActiveDb };
