<template>
  <backdrop />
  <v-app>
    <v-progress-linear
      v-hide="!isLoading"
      indeterminate
      location="top"
      color="primary"
      absolute />
    <router-view-transition is-root />
    <snackbar />
  </v-app>
  <player-element />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLoading } from '@/composables';

const loading = useLoading();

const isLoading = computed(() => loading.running.length > 0);
</script>
