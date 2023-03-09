<template>
  <v-btn
    :icon="IMdiSkipPrevious"
    :size="size"
    @click="playbackManager.setPreviousTrack" />
</template>

<script setup lang="ts">
import IMdiSkipPrevious from 'virtual:icons/mdi/skip-previous';
import { playbackManagerStore } from '@/store';

defineProps<{ size?: string }>();

const playbackManager = playbackManagerStore();
</script>
