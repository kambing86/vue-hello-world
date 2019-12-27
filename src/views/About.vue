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
  },
  render() {
    return (
      <div class="about">
        <h1>
          This is an about page, {this.b} yeah {this.a}
        </h1>
        <div>{this.state.count}</div>
        <button onClick={this.upClick}>Up</button>
      </div>
    );
  }
};
</script>
