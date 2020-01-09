import { reactive, onMounted, computed } from "@vue/composition-api";
import { flow, groupBy, mapValues, map, sortBy } from "lodash";

export interface IRecord {
  town: string;
  flat_type: string;
  quarter: string;
  _id: number;
  price: string;
}

export interface IData {
  fields: { type: string; id: string }[];
  records: INormalizedRecord[];
}

export interface INormalizedRecord {
  town: string;
  flat_type: string;
  quarter: string;
  _id: number;
  price: number;
}

const normalizeData = (r: IRecord): INormalizedRecord => {
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
      r.price === "-" || r.price.toLowerCase() === "na" ? 0 : parseInt(r.price),
  };
};

export const useData = () => {
  const data = reactive({
    fields: [],
    records: [],
  } as IData);
  onMounted(async () => {
    const response = await fetch(
      "https://data.gov.sg/api/action/datastore_search?resource_id=a5ddfc4d-0e43-4bfe-8f51-e504e1365e27&limit=10000",
    );
    const jsonResult = await response.json();
    data.fields = jsonResult.result.fields;
    data.records = jsonResult.result.records.map(normalizeData);
  });
  return data;
};

interface IDataset {
  name: string;
  type: "line";
  data: (number | null)[];
  connectNulls: true;
}

export const useFilteredData = (
  data: IData,
  state: {
    roomType: string;
    areas: string[];
  },
) => {
  return computed(() => {
    const records = data.records.filter(
      r => r.flat_type === state.roomType && state.areas.includes(r.town),
    );
    const quarters = Array.from(new Set(records.map(r => r.quarter))).sort();
    const transformFunc: (arr: INormalizedRecord[]) => IDataset[] = flow(
      arr => groupBy(arr, r => r.town),
      obj =>
        mapValues(obj, v =>
          quarters
            .map(q => v.find(r => r.quarter === q))
            .map(r => (r && (r.price === 0 ? null : r.price)) || null),
        ),
      obj =>
        map(
          obj,
          (value, key) =>
            ({
              name: key,
              type: "line",
              data: value,
              connectNulls: true,
            } as IDataset),
        ),
      arr => arr.filter(a => !a.data.every(d => d === null)),
      arr => sortBy(arr, a => a.name),
    );
    const datasets = transformFunc(records);
    const legends = datasets.map(d => d.name);
    return { quarters, datasets, legends };
  });
};
