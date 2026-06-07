import { configureStore } from "@reduxjs/toolkit";

import { practiceReducer } from "./practiceSlice";

export function createAppStore() {
  return configureStore({
    reducer: {
      practice: practiceReducer,
    },
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
