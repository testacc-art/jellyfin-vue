import { reactive, readonly } from 'vue';

enum PossibleOrigins {
  Suspense = 0,
  Axios = 1
}

const loading = reactive<PossibleOrigins[]>([]);

const fns = {
  start(origin: PossibleOrigins): void {
    loading.push(origin);
  },
  finish(origin: PossibleOrigins): void {
    const index = loading.indexOf(origin);

    if (index > -1) {
      loading.splice(index, 1);
      console.log('removed', origin, loading);
    }
  },
  running: readonly(loading),
  origins: PossibleOrigins
};

/**
 * Loading process
 */
export function useLoading(): typeof fns {
  return fns;
}
