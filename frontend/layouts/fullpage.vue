<template>
  <v-app>
    <v-main>
      <nuxt />
    </v-main>
    <v-footer app color="rgba(0, 0, 0, 0)">
      <locale-switcher large top />
    </v-footer>
    <snackbar />
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({});
</script>
