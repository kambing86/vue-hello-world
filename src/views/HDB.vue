<script>
import Vue from "vue";
import { reactive, onUnmounted, onMounted } from "@vue/composition-api";
import { flow, groupBy, mapValues, map, cloneDeep } from "lodash";
import distinctColors from "distinct-colors";
// @ts-ignore
import { VBtn, VLayout, VProgressCircular } from "vuetify/lib";
import ECharts from "vue-echarts";
import "echarts";

const useData = () => {
  const data = reactive({
    fields: [],
    records: []
  });
  onMounted(async () => {
    const response = await fetch(
      "https://data.gov.sg/api/action/datastore_search?resource_id=a5ddfc4d-0e43-4bfe-8f51-e504e1365e27&limit=10000"
    );
    const jsonResult = await response.json();
    data.fields = jsonResult.result.fields;
    data.records = jsonResult.result.records;
  });
  return data;
};

const getNearestMin = numbers => {
  const min = Math.min(...numbers);
  const nearestUnit = Math.pow(10, Math.floor(Math.log10(min)));
  return min - (min % nearestUnit);
};

const roomType = "5-ROOM";

export default {
  components: {
    "v-layout": VLayout,
    "v-progress-circular": VProgressCircular,
    "v-chart": ECharts
  },
  setup(props, context) {
    // console.log("setup", props, context);
    const data = useData();
    return { data };
  },
  computed: {
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
      const result = vm.data.records
        .filter(r => r.flat_type.toUpperCase() === roomType)
        .map(normalize);
      return result;
    },
    options: vm => {
      const isDarkTheme = vm.$vuetify.theme.isDark;
      const textStyle = isDarkTheme ? { textStyle: { color: "#fff" } } : {};
      const lineStyle = isDarkTheme
        ? { axisLine: { lineStyle: { color: "#fff" } } }
        : {};
      const dataZoomStyle = isDarkTheme
        ? {
            dataBackground: {
              lineStyle: { color: "#fff" },
              areaStyle: { color: "#aaa" }
            }
          }
        : {};
      const datasetColorStyle = isDarkTheme
        ? { lightMin: 50, lightMax: 100 }
        : { lightMin: 0, lightMax: 50 };
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
              .map(r => r && (r.price === 0 ? null : r.price))
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
        chromaMin: 50,
        quality: Number.MAX_SAFE_INTEGER,
        ...datasetColorStyle
      }).map(c => c.toString());
      return {
        title: {
          text: `${roomType} Resale Flat Prices`,
          left: "50%",
          textAlign: "center",
          ...textStyle
        },
        tooltip: {
          trigger: "item"
        },
        legend: {
          type: "scroll",
          top: "4%",
          data: legends,
          ...textStyle
        },
        dataZoom: [
          {
            type: "slider",
            ...dataZoomStyle,
            ...textStyle
          }
        ],
        grid: {
          top: "12%",
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
          data: labels,
          ...lineStyle
        },
        yAxis: {
          type: "value",
          name: "$ Singapore dollars",
          min: value => {
            return getNearestMin([value.min]);
          },
          ...lineStyle
        },
        series: datasets,
        color,
        ...textStyle
      };
    }
  },
  render() {
    return (
      <v-layout column fill-height justify-center align-center>
        {this.data.records.length === 0 && (
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
        )}
        {this.data.records.length > 0 && (
          <v-chart
            options={this.options}
            style={{ width: "100%", height: "100%" }}
            autoresize
          />
        )}
      </v-layout>
    );
  }
};
</script>
