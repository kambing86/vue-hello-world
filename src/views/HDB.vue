<script>
import Vue from "vue";
import {
  reactive,
  onUnmounted,
  onMounted,
  computed
} from "@vue/composition-api";
import { flow, groupBy, mapValues, map, sortBy } from "lodash";
import color from "color";
// @ts-ignore
import { VBtn, VCard, VProgressCircular, VSelect } from "vuetify/lib";
import ECharts from "vue-echarts";
import "echarts";
import { getRandom } from "@/utils/goldenRand";

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
    data.records = jsonResult.result.records.map(normalizeData);
  });
  return data;
};

const getNearestMin = numbers => {
  const min = Math.min(...numbers);
  const nearestUnit = Math.pow(10, Math.floor(Math.log10(min)));
  return min - (min % nearestUnit);
};

const darkThemeColor1 = "#fff";
const darkThemeColor2 = "#888";

const normalizeData = r => {
  let town = r.town.toUpperCase();
  if (town.startsWith("CENTRAL")) {
    town = "CENTRAL";
  }
  let flat_type = r.flat_type.toUpperCase();
  if (flat_type.startsWith("EXEC")) {
    flat_type = "EXEC";
  }
  return {
    ...r,
    town,
    flat_type,
    price:
      r.price === "-" || r.price.toLowerCase() === "na" ? 0 : parseInt(r.price)
  };
};

const useEChartsOptions = (context, data, state) => {
  const datasets = computed(() => {
    const records = data.records.filter(r => r.flat_type === selectedRoomType);
    const quarters = Array.from(new Set(records.map(r => r.quarter))).sort();
    const transformFunc = flow([
      arr => groupBy(arr, r => r.town),
      obj =>
        mapValues(obj, v =>
          quarters
            .map(q => v.find(r => r.quarter === q))
            .map(r => (r && (r.price === 0 ? null : r.price)) || null)
        ),
      obj =>
        map(obj, (value, key) => ({
          name: key,
          type: "line",
          data: value,
          connectNulls: true
        })),
      arr => arr.filter(a => !a.data.every(d => d === null)),
      arr => sortBy(arr, a => a.name)
    ]);
    return transformFunc(records);
  });
  return computed(() => {
    const selectedRoomType = state.roomType;
    const isDarkTheme = context.root.$vuetify.theme.isDark;
    const textStyle = isDarkTheme
      ? { textStyle: { color: darkThemeColor1 } }
      : {};
    const lineStyle = isDarkTheme
      ? {
          lineStyle: { color: darkThemeColor1 }
        }
      : {};
    const legendStyle = isDarkTheme
      ? {
          ...textStyle,
          inactiveColor: darkThemeColor2,
          borderColor: darkThemeColor2,
          pageTextStyle: { color: darkThemeColor1 },
          pageIconColor: darkThemeColor1,
          pageIconInactiveColor: darkThemeColor2
        }
      : {};
    const axisStyle = isDarkTheme ? { axisLine: { ...lineStyle } } : {};
    const dataZoomStyle = isDarkTheme
      ? {
          dataBackground: {
            ...lineStyle,
            areaStyle: { color: darkThemeColor2 }
          }
        }
      : {};
    const datasetColorStyle = isDarkTheme
      ? { lightMin: 50, lightMax: 100 }
      : { lightMin: 0, lightMax: 50 };
    const records = data.records.filter(r => r.flat_type === selectedRoomType);
    const quarters = Array.from(new Set(records.map(r => r.quarter))).sort();
    const transformFunc = flow([
      arr => groupBy(arr, r => r.town),
      obj =>
        mapValues(obj, v =>
          quarters
            .map(q => v.find(r => r.quarter === q))
            .map(r => (r && (r.price === 0 ? null : r.price)) || null)
        ),
      obj =>
        map(obj, (value, key) => ({
          name: key,
          type: "line",
          data: value,
          connectNulls: true
        })),
      arr => arr.filter(a => !a.data.every(d => d === null)),
      arr => sortBy(arr, a => a.name)
    ]);
    const datasets = transformFunc(records);
    const legends = datasets.map(d => d.name);
    const colors = [];
    const hRandom = getRandom(0, 360);
    const lRandom = isDarkTheme ? getRandom(50, 75) : getRandom(25, 50);
    for (let i = 0; i < datasets.length; i++) {
      colors.push(color({ h: hRandom(), s: 100, l: lRandom() }).hex());
    }
    return {
      title: {
        text: `${selectedRoomType} Resale Flat Prices`,
        left: "50%",
        textAlign: "center",
        ...textStyle
      },
      tooltip: {
        trigger: "item"
      },
      legend: {
        type: "scroll",
        top: "28",
        data: legends,
        ...legendStyle
      },
      dataZoom: [
        {
          type: "slider",
          ...dataZoomStyle,
          ...textStyle
        },
        {
          type: "inside"
        }
      ],
      grid: {
        top: "88",
        left: "10",
        right: "10",
        bottom: "38",
        containLabel: true
      },
      xAxis: {
        name: "Quarter",
        nameLocation: "center",
        nameGap: 25,
        boundaryGap: false,
        data: quarters,
        ...axisStyle
      },
      yAxis: {
        type: "value",
        name: "$ Singapore dollars",
        min: value => {
          return getNearestMin([value.min]);
        },
        ...axisStyle
      },
      series: datasets,
      color: colors,
      ...textStyle
    };
  });
};

export default {
  components: {
    "v-card": VCard,
    "v-progress-circular": VProgressCircular,
    "v-chart": ECharts,
    "v-select": VSelect
  },
  setup(props, context) {
    // console.log("setup", props, context);
    const data = useData();
    const state = reactive({
      roomType: "5-ROOM"
    });
    const roomTypes = computed(() =>
      Array.from(new Set(data.records.map(r => r.flat_type)))
    );
    const options = useEChartsOptions(context, data, state);
    return { data, state, roomTypes, options };
  },
  render() {
    return (
      <v-card class="d-flex flex-column fill-height align-center pa-2">
        {this.data.records.length === 0 && (
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
        )}
        {this.roomTypes.length > 0 && (
          <v-select
            items={this.roomTypes}
            v-model={this.state.roomType}
            label="Room types"
            dense
            outlined
          ></v-select>
        )}
        {this.data.records.length > 0 && (
          <v-chart
            options={this.options}
            style={{ width: "100%", height: "100%" }}
            autoresize
          />
        )}
      </v-card>
    );
  }
};
</script>
