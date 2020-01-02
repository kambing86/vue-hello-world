<script>
import Vue from "vue";
import { reactive, onUnmounted, onMounted } from "@vue/composition-api";
import { flow, groupBy, mapValues, map } from "lodash";
import distinctColors from "distinct-colors";
// @ts-ignore
import { chartXKCDXY } from "chart.xkcd-vue";
// @ts-ignore
import { VProgressCircular } from "vuetify/lib";
import ECharts from "vue-echarts";
import "echarts";

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

const getNearestMin = numbers => {
  const min = Math.min(...numbers);
  const nearestUnit = Math.pow(10, Math.floor(Math.log10(min)));
  return min - (min % nearestUnit);
};

export default {
  components: {
    "v-progress-circular": VProgressCircular,
    "chartxkcd-xy": chartXKCDXY,
    "v-chart": ECharts
  },
  setup(props, context) {
    // console.log("setup", props, context);
    const state = useData();
    return { state };
  },
  computed: {
    xyConfig: vm => {
      const normalizedRecords = vm.recordsIn2019;
      const labels = Array.from(
        new Set(normalizedRecords.map(r => r.quarter))
      ).sort();
      const transformFunc = flow([
        arr => groupBy(arr, r => r.town),
        obj =>
          mapValues(obj, v =>
            labels
              .map(q => v.find(r => r.quarter === q))
              .filter(r => r != null && r.price !== 0)
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
      const normalize = r => {
        let town = r.town.toUpperCase();
        if (town.startsWith("CENTRAL")) {
          town = "CENTRAL";
        }
        return {
          ...r,
          town,
          flat_type: r.flat_type.toUpperCase(),
          price: r.price === "-" ? 0 : parseInt(r.price)
        };
      };
      const result = vm.state.records
        .filter(
          r =>
            r.quarter.startsWith("2019") &&
            r.flat_type.toUpperCase() === "5-ROOM"
        )
        .map(normalize);
      // console.log(result.filter(r => r.town.startsWith("QUEEN")));
      return result;
    },
    options: vm => {
      const normalizedRecords = vm.recordsIn2019;
      const labels = Array.from(
        new Set(normalizedRecords.map(r => r.quarter))
      ).sort();
      const transformFunc = flow([
        arr => groupBy(arr, r => r.town),
        obj =>
          mapValues(obj, v =>
            labels
              .map(q => v.find(r => r.quarter === q))
              .filter(r => r != null)
              .map(r => (r.price === 0 ? null : r.price))
          ),
        obj =>
          map(obj, (value, key) => ({
            name: key,
            type: "line",
            data: value,
            connectNulls: true
          })),
        arr => arr.filter(a => !a.data.every(d => d === null))
      ]);
      const datasets = transformFunc(normalizedRecords);
      const legends = datasets.map(d => d.name);
      const color = distinctColors({
        count: datasets.length,
        quality: Number.MAX_SAFE_INTEGER
      }).map(c => c.toString());
      return {
        title: {
          text: "Resale Flat Prices"
        },
        tooltip: {
          trigger: "axis"
        },
        legend: {
          data: legends,
          top: "4%"
        },
        grid: {
          top: "20%",
          left: "5%",
          right: "5%",
          bottom: "5%",
          containLabel: true
        },
        xAxis: {
          name: "Quarter",
          nameLocation: "center",
          nameGap: 25,
          boundaryGap: false,
          data: labels
        },
        yAxis: {
          type: "value",
          name: "$ Singapore dollars",
          min: value => {
            return getNearestMin([value.min]);
          }
        },
        series: datasets,
        color
      };
    }
  },
  render() {
    return (
      <div style={{ height: "100%" }}>
        {this.state.records.length === 0 && (
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
        )}
        {/*{this.state.records.length > 0 && (
          <chartxkcd-xy config={this.xyConfig}></chartxkcd-xy>
        )}*/}
        {this.state.records.length > 0 && (
          <v-chart
            options={this.options}
            style={{ width: "100%", height: "100%" }}
            autoresize
          />
        )}
      </div>
    );
  }
};
</script>
