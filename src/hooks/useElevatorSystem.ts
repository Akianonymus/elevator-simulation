import { useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import { useElevatorStore } from "@/store/elevatorStore";
import {
  SystemState,
  SimulationConfig,
  ElevatorRequest,
  LogEntry,
  SimulationStats,
  ElevatorState,
} from "@/lib/types";
import { useShallow } from "zustand/react/shallow";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const useElevatorSystem = () => {
  const socketRef = useRef<any>(null);
  const {
    setSystemState,
    setConnectionStatus,
    setError,
    setLogs,
    setStats,
    updateLogs,
  } = useElevatorStore();

  // Debounced state updates to prevent rapid re-renders
  const debouncedSetSystemState = useCallback(
    debounce((state: SystemState) => {
      setSystemState(state);
    }, 16), // ~60fps
    [setSystemState]
  );

  useEffect(() => {
    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      timeout: 5000,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.emit("get_logs");

    // Connection events
    socket.on("connect", () => {
      setConnectionStatus(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      setConnectionStatus(false);
    });

    socket.on("connect_error", (error: Error) => {
      setConnectionStatus(false);
      setError(`Connection failed: ${error.message}`);
    });

    // System events with debounced updates
    socket.on("system_state", (systemState: SystemState) => {
      debouncedSetSystemState(systemState);
    });

    socket.on("logs", (logs: LogEntry[]) => {
      setLogs(logs);
    });

    socket.on("new_log", (log: LogEntry) => {
      updateLogs(log);
    });

    socket.on("stats", (stats: SimulationStats) => {
      setStats(stats);
    });

    // Error handling
    socket.on(
      "error",
      (error: { success: boolean; error: string; details?: string }) => {
        setError(error.error + (error.details ? `: ${error.details}` : ""));
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [
    debouncedSetSystemState,
    setConnectionStatus,
    setError,
    setLogs,
    setStats,
  ]);

  // Action functions that emit to socket
  const actions = {
    // System control
    startSimulation: () => {
      socketRef.current?.emit("start_simulation");
    },
    stopSimulation: () => {
      socketRef.current?.emit("stop_simulation");
    },
    resetSimulation: () => {
      socketRef.current?.emit("reset_simulation");
      socketRef.current?.emit("get_logs");
    },

    // Configuration
    updateConfig: (config: Partial<SimulationConfig>) => {
      socketRef.current?.emit("update_config", config);
    },

    // Requests
    addRequest: (originFloor: number, destinationFloor: number) => {
      socketRef.current?.emit("add_request", { originFloor, destinationFloor });
    },
    generateRandomRequests: (num: number) => {
      socketRef.current?.emit("generate_random_requests", { num });
    },

    // Data retrieval
    getSystemStatus: () => {
      socketRef.current?.emit("get_system_status");
    },
    getElevatorState: (elevatorId: number) => {
      socketRef.current?.emit("get_elevator_state", { elevatorId });
    },
    getLogs: (elevatorId?: number, limit?: number) => {
      socketRef.current?.emit("get_logs", { elevatorId, limit });
    },
    getStats: () => {
      socketRef.current?.emit("get_stats");
    },
  };

  return actions;
};

// Custom hook for selective elevator state subscription
export const useElevatorState = (elevatorId?: number) => {
  return useElevatorStore(
    useShallow((state) => {
      if (!state.systemState) return null;

      if (elevatorId !== undefined) {
        return (
          state.systemState.elevators.find((e) => e.id === elevatorId) || null
        );
      }

      return state.systemState.elevators;
    })
  );
};

// Custom hook for selective system state subscription
export const useSystemState = () => {
  return useElevatorStore(useShallow((state) => state.systemState));
};

// Custom hook for connection status
export const useConnectionStatus = () => {
  return useElevatorStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
      error: state.error,
    }))
  );
};
