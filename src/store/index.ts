import thunk from "redux-thunk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore, applyMiddleware } from "redux";
import { persistStore } from "redux-persist";
import persistCombineReducers from "redux-persist/es/persistCombineReducers";
import rootReducer from "./reducers";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["user"],
};

const persistedReducer = persistCombineReducers(persistConfig, rootReducer);

export const store = createStore(persistedReducer, applyMiddleware(thunk));
export const persistor = persistStore(store);

// Types
interface RootState {
  user: User;
  message: MessageState;
  loader: LoaderState;
  clients: ClientsState;
  projects: ProjectsState;
  works: WorksState;
  modal: ModalState;
  machines: MachinesState;
  vehicles: VehiclesState;
  rechanges: RechangesList;
}

declare module "react-redux" {
  interface DefaultRootState extends RootState {}
}
