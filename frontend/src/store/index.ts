import clientSettings from './clientSettings';
import items from './items';
import taskManager from './taskManager';
import userLibraries from './userLibraries';
import playbackManager from './playbackManager';
import playerElement from './playerElement';

/**
 * Get global instance of clientSettings store
 */
export function clientSettingsStore(): typeof clientSettings {
  return clientSettings;
}

/**
 * Get global instance of items store
 */
export function itemsStore(): typeof items {
  return items;
}

/**
 * Get global instance of taskManager store
 */
export function taskManagerStore(): typeof taskManager {
  return taskManager;
}

/**
 * Get global instance of userLibraries store
 */
export function userLibrariesStore(): typeof userLibraries {
  return userLibraries;
}

/**
 * Get global instance of playbackManager store
 */
export function playbackManagerStore(): typeof playbackManager {
  return playbackManager;
}

/**
 * Get global instance of playerElement store
 */
export function playerElementStore(): typeof playerElement {
  return playerElement;
}

export type { HomeSection } from './userLibraries';
export { TaskType } from './taskManager';
export * from './playbackManager';
