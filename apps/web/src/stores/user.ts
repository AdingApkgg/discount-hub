import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      demoMode: false,
      setDemoMode: (v) => set({ demoMode: v }),
    }),
    { name: "jz-user" },
  ),
);
