import Vue from "vue";
import Vuex from "vuex";
import hdb, { State as hdbState } from "./hdb";

Vue.use(Vuex);

interface State {
  hdb: hdbState;
}

const store = new Vuex.Store<State>({
  modules: {
    hdb,
  },
});

export type StoreType = typeof store;

export default store;
