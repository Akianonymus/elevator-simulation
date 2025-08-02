import { create } from "zustand";
import {
  SystemState,
  SimulationConfig,
  ElevatorRequest,
  LogEntry,
  SimulationStats,
} from "@/lib/types";

interface ElevatorStore {
  // State
  systemState: SystemState | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  logs: LogEntry[];
  stats: SimulationStats | null;

  // Actions
  setSystemState: (state: SystemState) => void;
  setConnectionStatus: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLogs: (logs: LogEntry[]) => void;
  updateLogs: (log: LogEntry) => void;
  setStats: (stats: SimulationStats) => void;

  // Socket actions
  connect: () => void;
  disconnect: () => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  updateConfig: (config: Partial<SimulationConfig>) => void;
  addRequest: (originFloor: number, destinationFloor: number) => void;
  getLogs: (elevatorId?: number, limit?: number) => void;
  getStats: () => void;
}

export const useElevatorStore = create<ElevatorStore>((set, get) => ({
  // Initial state
  systemState: null,
  isConnected: false,
  isLoading: false,
  error: null,
  logs: [],
  stats: null,

  // Actions
  setSystemState: (state) => set({ systemState: state }),
  setConnectionStatus: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setLogs: (logs) => set({ logs }),
  updateLogs: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setStats: (stats) => set({ stats }),

  // Socket actions (will be implemented in the hook)
  connect: () => {},
  disconnect: () => {},
  startSimulation: () => {},
  stopSimulation: () => {},
  resetSimulation: () => {},
  updateConfig: () => {},
  addRequest: () => {},
  getLogs: () => {},
  getStats: () => {},
}));
