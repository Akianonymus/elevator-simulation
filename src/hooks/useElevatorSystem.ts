import { useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import { useElevatorStore } from "@/store/elevatorStore";
import {
  SystemState,
  SimulationConfig,
  LogEntry,
  SimulationStats,
} from "@/lib/types";
import { useShallow } from "zustand/react/shallow";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const useElevatorSystem = () => {
  const socketRef = useRef<SocketIOClient.Socket | null>(null);
  const logBufferRef = useRef<LogEntry[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    setSystemState,
    setConnectionStatus,
    setError,
    setLogs,
    setStats,
    updateLogs,
  } = useElevatorStore();

  // Function to flush buffered logs
  const flushLogBuffer = useCallback(() => {
    if (logBufferRef.current.length > 0) {
      // Add all buffered logs to the store
      logBufferRef.current.forEach((log) => {
        updateLogs(log);
      });
      // Clear the buffer
      logBufferRef.current = [];
    }
    updateTimeoutRef.current = null;
  }, [updateLogs]);

  // Function to schedule log updates
  const scheduleLogUpdate = useCallback(() => {
    if (updateTimeoutRef.current === null) {
      updateTimeoutRef.current = setTimeout(flushLogBuffer, 200);
    }
  }, [flushLogBuffer]);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        timeout: 10000,
        transports: ["websocket", "polling"],
      });
    }

    // Connection events
    socketRef.current.on("connect", () => {
      setConnectionStatus(true);
      setError(null);
    });

    socketRef.current.on("disconnect", () => {
      setConnectionStatus(false);
    });

    socketRef.current.on("connect_error", (error: Error) => {
      setConnectionStatus(false);
      setError(`Connection failed: ${error.message}`);
    });

    // System events with debounced updates
    socketRef.current.on("system_state", (systemState: SystemState) => {
      setSystemState(systemState);
    });

    socketRef.current.on("logs", (logs: LogEntry[]) => {
      setLogs(logs);
    });

    socketRef.current.on("new_log", (log: LogEntry) => {
      // Buffer the log instead of immediately updating
      logBufferRef.current.push(log);
      // Schedule an update if not already scheduled
      scheduleLogUpdate();
    });

    socketRef.current.on("stats", (stats: SimulationStats) => {
      setStats(stats);
    });

    // Error handling
    socketRef.current.on(
      "error",
      (error: { success: boolean; error: string; details?: string }) => {
        setError(error.error + (error.details ? `: ${error.details}` : ""));
      }
    );

    return () => {
      // Clear any pending timeout and flush remaining logs
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        flushLogBuffer();
      }
      socketRef.current?.disconnect();
    };
  }, [
    setConnectionStatus,
    setError,
    setLogs,
    setStats,
    scheduleLogUpdate,
    flushLogBuffer,
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
