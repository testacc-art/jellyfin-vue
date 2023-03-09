<template>
  <v-btn
    icon
    :disabled="!playbackManager.nextItem"
    :size="props.size"
    @click="playbackManager.setNextTrack">
    <v-icon>
      <i-mdi-skip-next />
    </v-icon>
  </v-btn>
</template>

<script setup lang="ts">
import { playbackManagerStore } from '@/store';

const props = defineProps<{ size?: string }>();
const playbackManager = playbackManagerStore();
</script>
