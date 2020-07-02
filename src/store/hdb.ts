import { Module } from "vuex";

export interface State {
  data: { fields: any; records: any } | null;
}

const hdbModule: Module<State, any> = {
  namespaced: true,
  state: {
    data: null,
  },
  getters: {
    fields: (state) => {
      return state.data?.fields ?? [];
    },
    records: (state) => {
      return state.data?.records ?? [];
    },
  },
  mutations: {
    setData(state, data) {
      state.data = data;
    },
  },
  actions: {
    async getData(context) {
      if (context.state.data === null) {
        const response = await fetch(
          "https://data.gov.sg/api/action/datastore_search?resource_id=a5ddfc4d-0e43-4bfe-8f51-e504e1365e27&limit=10000",
        );
        const jsonResult = await response.json();
        context.commit("setData", jsonResult.result);
      }
    },
  },
};

export default hdbModule;
