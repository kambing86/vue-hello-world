<script lang="tsx">
import Vue from "vue";
import {
  reactive,
  computed,
  SetupContext,
  createComponent,
  watch,
  ref,
} from "@vue/composition-api";
import { flow, groupBy, mapValues, map, sortBy } from "lodash";
import { VCard, VProgressCircular, VSelect, VCheckbox } from "vuetify/lib";
// @ts-ignore
import ECharts from "vue-echarts";
import "echarts";
// @ts-ignore
import iwanthue from "iwanthue";
// @ts-ignore
import precomputed from "iwanthue/precomputed/k-means";
import { useData, IData, INormalizedRecord } from "./HDB/getData";

const getNearestMin = (numbers: number[]) => {
  const min = Math.min(...numbers);
  const nearestUnit = Math.pow(10, Math.floor(Math.log10(min)));
  return min - (min % nearestUnit);
};

const darkThemeColor1 = "#fff";
const darkThemeColor2 = "#888";

const useFilteredData = (
  data: IData,
  state: {
    roomType: string;
    area: string[];
  },
) => {
  return computed(() => {
    const records = data.records.filter(
      r => r.flat_type === state.roomType && state.area.includes(r.town),
    );
    const quarters = Array.from(new Set(records.map(r => r.quarter))).sort();
    const transformFunc = flow([
      (arr: INormalizedRecord[]) => groupBy(arr, r => r.town),
      obj =>
        mapValues(obj, (v: INormalizedRecord[]) =>
          quarters
            .map(q => v.find((r: INormalizedRecord) => r.quarter === q))
            .map(r => (r && (r.price === 0 ? null : r.price)) || null),
        ),
      obj =>
        map(obj, (value, key) => ({
          name: key,
          type: "line",
          data: value,
          connectNulls: true,
        })),
      arr => arr.filter((a: any) => !a.data.every((d: any) => d === null)),
      arr => sortBy(arr, a => a.name),
    ]);
    return { quarters, datasets: transformFunc(records) };
  });
};

const useEChartsOptions = (
  context: SetupContext,
  filteredData: ReturnType<typeof useFilteredData>,
) => {
  return computed(() => {
    const legends = computed(() =>
      filteredData.value.datasets.map((d: any) => d.name),
    );
    const isDarkTheme = context.root.$vuetify.theme.dark;
    const textStyle = isDarkTheme
      ? { textStyle: { color: darkThemeColor1 } }
      : {};
    const lineStyle = isDarkTheme
      ? {
          lineStyle: { color: darkThemeColor1 },
        }
      : {};
    const legendStyle = isDarkTheme
      ? {
          ...textStyle,
          inactiveColor: darkThemeColor2,
          borderColor: darkThemeColor2,
          pageTextStyle: { color: darkThemeColor1 },
          pageIconColor: darkThemeColor1,
          pageIconInactiveColor: darkThemeColor2,
        }
      : {};
    const axisStyle = isDarkTheme ? { axisLine: { ...lineStyle } } : {};
    const dataZoomStyle = isDarkTheme
      ? {
          dataBackground: {
            ...lineStyle,
            areaStyle: { color: darkThemeColor2 },
          },
        }
      : {};
    const lightness = isDarkTheme
      ? {
          lmin: 50,
          lmax: 85,
        }
      : {
          lmin: 15,
          lmax: 50,
        };
    const datasetLength = filteredData.value.datasets.length;
    const colors =
      datasetLength <= 2
        ? precomputed[datasetLength]
        : iwanthue(datasetLength, {
            colorSpace: { cmin: 30, cmax: 100, ...lightness },
            seed: "random seed",
            quality: 100,
          });
    return {
      title: {
        text: `Resale Flat Prices`,
        left: "50%",
        textAlign: "center",
        ...textStyle,
      },
      tooltip: {
        trigger: "item",
      },
      legend: {
        type: "scroll",
        top: "28",
        data: legends.value,
        ...legendStyle,
      },
      dataZoom: [
        {
          type: "slider",
          ...dataZoomStyle,
          ...textStyle,
        },
        {
          type: "inside",
        },
      ],
      grid: {
        top: "88",
        left: "10",
        right: "10",
        bottom: "38",
        containLabel: true,
      },
      xAxis: {
        name: "Quarter",
        nameLocation: "center",
        nameGap: 25,
        boundaryGap: false,
        data: filteredData.value.quarters,
        ...axisStyle,
      },
      yAxis: {
        type: "value",
        name: "$ Singapore dollars",
        min: (value: any) => {
          return getNearestMin([value.min]);
        },
        ...axisStyle,
      },
      series: filteredData.value.datasets,
      color: colors,
      ...textStyle,
    };
  });
};

const preferAreas = [
  "BUKIT PANJANG",
  "BUKIT TIMAH",
  "CHOA CHU KANG",
  "JURONG EAST",
  "JURONG WEST",
  "SEMBAWANG",
  "SENGKANG",
  "SERANGOON",
  "WOODLANDS",
  "YISHUN",
];

// will be replaced by defineComponent
export default createComponent({
  components: {
    "v-card": VCard,
    "v-progress-circular": VProgressCircular,
    "v-chart": ECharts,
    "v-select": VSelect,
    "v-checkbox": VCheckbox,
  },
  setup(props, context) {
    // console.log("setup", props, context);
    const data = useData();
    const areas = computed(() =>
      Array.from(new Set(data.records.map(r => r.town))).sort(),
    );
    const roomTypes = computed(() =>
      Array.from(new Set(data.records.map(r => r.flat_type))),
    );
    const state = reactive({
      roomType: "5-ROOM",
      area: [] as string[],
    });
    const usePreferAreas = ref(true);
    watch([areas, usePreferAreas], () => {
      state.area = usePreferAreas.value
        ? preferAreas.filter(a => areas.value.includes(a))
        : (areas.value as string[]);
    });
    const filteredData = useFilteredData(data, state);
    const options = useEChartsOptions(context, filteredData);
    return { chart: data, state, usePreferAreas, roomTypes, areas, options };
  },
  render() {
    // check https://github.com/vuejs/composition-api/issues/191 for all @ts-ignore in render
    return (
      <v-card class="d-flex flex-column fill-height justify-center align-center pa-2">
        {//
        // @ts-ignore
        this.chart.records.length === 0 && (
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
        )}
        {
          <v-checkbox
            // @ts-ignore
            v-model={this.usePreferAreas}
            color="primary"
            label="Use Prefer areas"
          ></v-checkbox>
        }
        {//
        // @ts-ignore
        this.areas.length > 0 && (
          <v-select
            items={
              // @ts-ignore
              this.areas
            }
            v-model={
              // @ts-ignore
              this.state.area
            }
            label="Area"
            dense
            outlined
            multiple
          ></v-select>
        )}
        {//
        // @ts-ignore
        this.roomTypes.length > 0 && (
          <v-select
            items={
              // @ts-ignore
              this.roomTypes
            }
            v-model={
              // @ts-ignore
              this.state.roomType
            }
            label="Room types"
            dense
            outlined
          ></v-select>
        )}
        {//
        // @ts-ignore
        this.chart.records.length > 0 && (
          <v-chart
            options={
              // @ts-ignore
              this.options
            }
            style={{ width: "100%", height: "88vh" }}
            autoresize
          />
        )}
      </v-card>
    );
  },
});
</script>
