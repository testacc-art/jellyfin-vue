import { ref } from 'vue';
import {
  useMediaControls,
  useMediaQuery,
  useNow,
  useScroll
} from '@vueuse/core';
/**
 * This file contains global variables (specially VueUse refs) that are used multiple times across the client.
 * VueUse composables will set new event handlers, so it's more
 * efficient to reuse those, both in components and TS files.
 */

/**
 * Reactive Date.now() instance
 */
export const now = useNow();
/**
 * Reactive window scroll
 */
export const windowScroll = useScroll(window);
/**
 * Ref to the local media player
 */
export const mediaElementRef = ref<HTMLMediaElement>();
/**
 * Reactive media controls of the local media player
 */
export const mediaControls = useMediaControls(mediaElementRef);
/**
 * If user is using a fine pointer (mostly used in cards)
 */
export const isFinePointer = useMediaQuery('(pointer:fine)');
/**
 * If user doesn't want transitions
 */
export const prefersNoMotion = useMediaQuery('(prefers-reduced-motion)');
