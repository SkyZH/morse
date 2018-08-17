<template>
  <div id="app">
    <Morse/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Morse from './components/Morse.vue';

@Component({
  components: {
    Morse,
  },
})
export default class App extends Vue {}
</script>

<style lang="scss">
@import "bootstrap/scss/bootstrap.scss";
</style>
