<template>
  <v-layout column align-center fill-height justify-center>
    <h1>This is an about page, {{ b }} yeah {{ a }}</h1>
    <div>{{ state.count }}</div>
    <v-btn @click="upClick">Up</v-btn>
  </v-layout>
</template>

<script>
import { reactive } from "@vue/composition-api";

export default {
  setup() {
    const state = reactive({ count: 0 });
    const upClick = () => {
      state.count++;
    };
    return { state, upClick };
  },
  computed: {
    b() {
      return this.a.toUpperCase();
    }
  },
  data() {
    return {
      a: "test"
    };
  }
  // render() {
  //   return (
  //     <div class="about">
  //       <h1>
  //         This is an about page, {this.b} yeah {this.a}
  //       </h1>
  //       <div>{this.state.count}</div>
  //       <v-btn onClick={this.upClick}>Up</v-btn>
  //     </div>
  //   );
  // }
};
</script>
