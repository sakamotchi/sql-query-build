import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * カウンターストア（サンプル）
 * Pinia動作確認用のシンプルなカウンター実装
 */
export const useCounterStore = defineStore('counter', () => {
  // State
  const count = ref(0);
  const lastUpdated = ref<Date | null>(null);

  // Getters
  const doubleCount = computed(() => count.value * 2);
  const isEven = computed(() => count.value % 2 === 0);

  // Actions
  function increment() {
    count.value++;
    lastUpdated.value = new Date();
  }

  function decrement() {
    count.value--;
    lastUpdated.value = new Date();
  }

  function reset() {
    count.value = 0;
    lastUpdated.value = new Date();
  }

  function setCount(value: number) {
    count.value = value;
    lastUpdated.value = new Date();
  }

  return {
    // State
    count,
    lastUpdated,
    // Getters
    doubleCount,
    isEven,
    // Actions
    increment,
    decrement,
    reset,
    setCount,
  };
});
