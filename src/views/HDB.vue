<script>
import Vue from "vue";
import { reactive, onMounted, computed } from "@vue/composition-api";
import { flow, groupBy, mapValues, map, sortBy } from "lodash";
import { VBtn, VCard, VProgressCircular, VSelect } from "vuetify/lib";
import ECharts from "vue-echarts";
import "echarts";
import iwanthue from "iwanthue";

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
  const quarters = computed(() =>
    Array.from(new Set(data.records.map(r => r.quarter))).sort()
  );
  const datasets = computed(() => {
    const records = data.records.filter(r => r.flat_type === state.roomType);
    const transformFunc = flow([
      arr => groupBy(arr, r => r.town),
      obj =>
        mapValues(obj, v =>
          quarters.value
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
  const legends = computed(() => datasets.value.map(d => d.name));
  return computed(() => {
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
    const lightness = isDarkTheme
      ? {
          lmin: 50,
          lmax: 85
        }
      : {
          lmin: 15,
          lmax: 50
        };
    const colors = iwanthue(datasets.value.length, {
      colorSpace: { cmin: 30, cmax: 100, ...lightness },
      seed: "random seed",
      quality: 100
    });
    return {
      title: {
        text: `${state.roomType} Resale Flat Prices`,
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
        data: legends.value,
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
        data: quarters.value,
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
      series: datasets.value,
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
      <v-card class="d-flex flex-column fill-height justify-center align-center pa-2">
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
