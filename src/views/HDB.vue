<script>
import { reactive, onUnmounted, onMounted } from "@vue/composition-api";

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

export default {
  setup() {
    const state = useData();
    return { state };
  },
  computed: {
    recordsIn2019: vm => {
      return vm.state.records
        .filter(r => r.quarter.startsWith("2019") && r.flat_type === "5-ROOM")
        .sort((a, b) => {
          if (a.price === "-") return 1;
          if (b.price === "-") return -1;
          return parseInt(a.price) - parseInt(b.price);
        });
    }
  },
  render() {
    return (
      <div>
        <ul>
          {this.recordsIn2019.map(record => (
            <li>{JSON.stringify(record)}</li>
          ))}
        </ul>
      </div>
    );
  }
};
</script>
