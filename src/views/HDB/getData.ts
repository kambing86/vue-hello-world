import { reactive, onMounted } from "@vue/composition-api";

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
