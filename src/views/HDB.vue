<script lang="tsx">
import {
  reactive,
  computed,
  SetupContext,
  defineComponent,
  watch,
  ref,
  toRefs,
} from "@vue/composition-api";
import sortBy from "lodash/sortBy";
import isEqual from "lodash/isEqual";
import { VCard, VProgressCircular, VSelect, VCheckbox } from "vuetify/lib";
import ECharts from "vue-echarts";
import "echarts";
import iwanthue from "iwanthue";
// @ts-ignore
import precomputed from "iwanthue/precomputed/k-means";
import { useData, useFilteredData } from "./HDB/getData";
import store from "@/store";

const getNearestMin = (numbers: number[]) => {
  const min = Math.min(...numbers);
  const nearestUnit = Math.pow(10, Math.floor(Math.log10(min)));
  return min - (min % nearestUnit);
};

const lightThemeColor1 = "#000";
const lightThemeColor2 = "#aaa";
const darkThemeColor1 = "#fff";
const darkThemeColor2 = "#555";

const useEChartsOptions = (
  context: SetupContext,
  filteredData: ReturnType<typeof useFilteredData>,
) => {
  const styles = computed(() => {
    const isDarkTheme = context.root.$vuetify.theme.dark;
    const textStyle = isDarkTheme
      ? { textStyle: { color: darkThemeColor1 } }
      : { textStyle: { color: lightThemeColor1 } };
    const lineStyle = isDarkTheme
      ? {
          lineStyle: { color: darkThemeColor1 },
        }
      : {
          lineStyle: { color: lightThemeColor1 },
        };
    const legendStyle = isDarkTheme
      ? {
          ...textStyle,
          inactiveColor: darkThemeColor2,
          borderColor: darkThemeColor2,
          pageTextStyle: { color: darkThemeColor1 },
          pageIconColor: darkThemeColor1,
          pageIconInactiveColor: darkThemeColor2,
        }
      : {
          ...textStyle,
          inactiveColor: lightThemeColor2,
          borderColor: lightThemeColor2,
          pageTextStyle: { color: lightThemeColor1 },
          pageIconColor: lightThemeColor1,
          pageIconInactiveColor: lightThemeColor2,
        };
    const axisStyle = { axisLine: { ...lineStyle } };
    const dataZoomStyle = isDarkTheme
      ? {
          dataBackground: {
            ...lineStyle,
            areaStyle: { color: darkThemeColor2 },
          },
        }
      : {
          dataBackground: {
            ...lineStyle,
            areaStyle: { color: lightThemeColor2 },
          },
        };
    const lightness = isDarkTheme
      ? {
          lmin: 50,
          lmax: 85,
        }
      : {
          lmin: 15,
          lmax: 50,
        };
    return {
      textStyle,
      legendStyle,
      axisStyle,
      dataZoomStyle,
      lightness,
    };
  });
  return computed(() => {
    const { textStyle, legendStyle, axisStyle, dataZoomStyle, lightness } =
      styles.value;
    const { datasets, quarters, legends } = filteredData.value;
    const datasetLength = datasets.length;
    const iwanthueOptions = {
      colorSpace: { cmin: 30, cmax: 100, ...lightness },
      seed: "random seed",
    };
    const colors =
      datasetLength <= 2
        ? precomputed[15].slice(0, datasetLength)
        : iwanthue(
            datasetLength,
            // @ts-ignore
            iwanthueOptions,
          );
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
        data: legends,
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
        data: quarters,
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
      series: datasets,
      color: colors,
      ...textStyle,
    };
  });
};

const preferAreas = [
  "BUKIT BATOK",
  "BUKIT PANJANG",
  "BUKIT TIMAH",
  "CHOA CHU KANG",
  "JURONG EAST",
  "JURONG WEST",
  "SEMBAWANG",
  "SERANGOON",
  "WOODLANDS",
  "YISHUN",
];

export default defineComponent({
  components: {
    "v-card": VCard,
    "v-progress-circular": VProgressCircular,
    "v-chart": ECharts,
    "v-select": VSelect,
    "v-checkbox": VCheckbox,
  },
  store,
  setup(props, context) {
    // console.log("setup", props, context);
    const data = useData(context.root.$store);
    const areas = computed(() =>
      Array.from(new Set(data.records.map((r) => r.town))).sort(),
    );
    const roomTypes = computed(() =>
      Array.from(new Set(data.records.map((r) => r.flat_type))),
    );
    const setPreferAreas = ref(false);
    const state = reactive({
      roomType: "5-ROOM",
      usePreferAreas: true,
      areas: [] as string[],
    });
    watch([areas, toRefs(state).usePreferAreas], () => {
      if (setPreferAreas.value) {
        setPreferAreas.value = false;
        return;
      }
      const newAreas = state.usePreferAreas
        ? preferAreas.filter((a) => areas.value.includes(a))
        : (areas.value as string[]);
      if (!isEqual(sortBy(newAreas), sortBy(state.areas))) {
        state.areas = newAreas;
      }
    });
    watch([toRefs(state).areas], () => {
      if (
        areas.value.length > 0 &&
        state.usePreferAreas &&
        !isEqual(sortBy(state.areas), sortBy(preferAreas))
      ) {
        setPreferAreas.value = true;
        state.usePreferAreas = false;
      }
    });
    const filteredData = useFilteredData(data, state);
    const option = useEChartsOptions(context, filteredData);
    return { chart: data, state, roomTypes, areas, option };
  },
  render() {
    return (
      <v-card class="d-flex flex-column fill-height justify-center align-center pa-2">
        {this.chart.records.length === 0 && (
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
        )}
        {
          <v-checkbox
            v-model={this.state.usePreferAreas}
            color="primary"
            label="Use Prefer areas"
          ></v-checkbox>
        }
        {this.areas.length > 0 && (
          <v-select
            items={this.areas}
            v-model={this.state.areas}
            label="Area"
            dense
            outlined
            multiple
            style={{ width: "50%" }}
          ></v-select>
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
        {this.chart.records.length > 0 && (
          <v-chart
            option={this.option}
            style={{ width: "100%", height: "88vh" }}
            autoresize
          />
        )}
      </v-card>
    );
  },
});
</script>
