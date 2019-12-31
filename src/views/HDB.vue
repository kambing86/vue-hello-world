<script>
import Vue from "vue";
import { reactive, onUnmounted, onMounted } from "@vue/composition-api";
import { flow, groupBy, mapValues, map } from "lodash";
import distinctColors from "distinct-colors";
// @ts-ignore
import { chartXKCDXY } from "chart.xkcd-vue";
// @ts-ignore
import { VProgressCircular } from "vuetify/lib";

Vue.component("chartxkcd-xy", chartXKCDXY);
Vue.component("v-progress-circular", VProgressCircular);

const useData = () => {
  const state = reactive({
    fields: [],
    records: []
  });
  onMounted(async () => {
    const response = await fetch(
      "https://data.gov.sg/api/action/datastore_search?resource_id=a5ddfc4d-0e43-4bfe-8f51-e504e1365e27&limit=10000"
    );
    const jsonResult = await response.json();
    state.fields = jsonResult.result.fields;
    state.records = jsonResult.result.records;
  });
  return state;
};

export default {
  setup() {
    const state = useData();
    return { state };
  },
  computed: {
    xyConfig: vm => {
      const normalizedRecords = vm.recordsIn2019.map(r => ({
        ...r,
        town: r.town.toUpperCase()
      }));
      const labels = Array.from(
        new Set(normalizedRecords.map(r => r.quarter))
      ).sort();
      const transformFunc = flow([
        arr => groupBy(arr, r => r.town),
        obj =>
          mapValues(obj, v =>
            labels
              .map(q => v.find(r => r.quarter === q))
              .filter(r => r != null && r.price !== "-")
              .map(r => ({
                x: r.quarter.replace("Q", ""),
                y: parseInt(r.price)
              }))
          ),
        obj => map(obj, (value, key) => ({ label: key, data: value }))
      ]);
      const datasets = transformFunc(normalizedRecords);
      const dataColors = distinctColors({
        count: datasets.length,
        quality: Number.MAX_SAFE_INTEGER
      }).map(c => c.toString());
      return {
        title: "Resale Flat Prices",
        xLabel: "Quarter",
        yLabel: "$ Singapore Dollors",
        data: {
          datasets
        },
        options: {
          dataColors,
          showLine: true,
          timeFormat: "YYYY-M",
          dotSize: 1
        }
      };
    },
    recordsIn2019: vm => {
      return vm.state.records
        .filter(
          r =>
            r.quarter.startsWith("2019") &&
            r.flat_type.toLowerCase() === "5-room"
        )
        .sort((a, b) => {
          if (a.price === "-") return 1;
          if (b.price === "-") return -1;
          return parseInt(a.price) - parseInt(b.price);
        });
    }
  },
  render() {
    return (
      <div>
        {this.state.records.length === 0 && (
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
        )}
        {this.state.records.length > 0 && (
          <chartxkcd-xy config={this.xyConfig}></chartxkcd-xy>
        )}
      </div>
    );
  }
};
</script>
