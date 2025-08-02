import { Server as SocketIOServer, Socket } from "socket.io";
import { ElevatorSystem } from "./elevatorSystem";
import { SimulationConfig } from "./types";

export function createSocketRoutes(
  io: SocketIOServer,
  elevatorSystem: ElevatorSystem
): void {
  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send initial system state to new client
    socket.emit("system_state", elevatorSystem.getSystemState());
    io.emit("logs", elevatorSystem.getLogs());

    socket.on("start_simulation", () => {
      try {
        elevatorSystem.startSimulation();
        io.emit("simulation_started", {
          success: true,
          message: "Simulation started successfully",
          timestamp: Date.now(),
        });
        io.emit("system_state", elevatorSystem.getSystemState());
      } catch (error) {
        socket.emit("error", {
          success: false,
          error: "Failed to start simulation",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Stop simulation (equivalent to POST /stop)
    socket.on("stop_simulation", () => {
      try {
        elevatorSystem.stopSimulation();
        io.emit("simulation_stopped", {
          success: true,
          message: "Simulation stopped successfully",
          timestamp: Date.now(),
        });
        io.emit("system_state", elevatorSystem.getSystemState());
      } catch (error) {
        socket.emit("error", {
          success: false,
          error: "Failed to stop simulation",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Reset simulation (equivalent to POST /reset)
    socket.on("reset_simulation", () => {
      try {
        elevatorSystem.resetSimulation();
        io.emit("simulation_reset", {
          success: true,
          message: "Simulation reset successfully",
          timestamp: Date.now(),
        });
        io.emit("system_state", elevatorSystem.getSystemState());
      } catch (error) {
        socket.emit("error", {
          success: false,
          error: "Failed to reset simulation",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Update configuration (equivalent to PUT /config)
    socket.on("update_config", (config: Partial<SimulationConfig>) => {
      try {
        // Validation
        if (
          config.numberOfElevators !== undefined &&
          (config.numberOfElevators < 1 || config.numberOfElevators > 10)
        ) {
          socket.emit("error", {
            success: false,
            error: "Number of elevators must be between 1 and 10",
          });
          return;
        }

        if (
          config.numberOfFloors !== undefined &&
          (config.numberOfFloors < 2 || config.numberOfFloors > 50)
        ) {
          socket.emit("error", {
            success: false,
            error: "Number of floors must be between 2 and 50",
          });
          return;
        }

        if (
          config.elevatorCapacity !== undefined &&
          config.elevatorCapacity < 1
        ) {
          socket.emit("error", {
            success: false,
            error: "Elevator capacity must be at least 1",
          });
          return;
        }

        if (
          config.requestFrequency !== undefined &&
          config.requestFrequency <= 0
        ) {
          socket.emit("error", {
            success: false,
            error: "Request frequency must be positive",
          });
          return;
        }

        if (
          config.simulationSpeed !== undefined &&
          config.simulationSpeed <= 0
        ) {
          socket.emit("error", {
            success: false,
            error: "Simulation speed must be positive",
          });
          return;
        }

        elevatorSystem.updateConfig(config);
        io.emit("config_updated", {
          success: true,
          message: "Configuration updated successfully",
          data: elevatorSystem.getSystemState().config,
        });
        io.emit("system_state", elevatorSystem.getSystemState());
      } catch (error) {
        socket.emit("error", {
          success: false,
          error: "Failed to update configuration",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    socket.on(
      "add_request",
      (data: { originFloor: number; destinationFloor: number }) => {
        try {
          const { originFloor, destinationFloor } = data;

          if (
            typeof originFloor !== "number" ||
            typeof destinationFloor !== "number"
          ) {
            socket.emit("error", {
              success: false,
              error: "Origin and destination floors must be numbers",
            });
            return;
          }

          // Validate floor numbers are integers
          if (
            !Number.isInteger(originFloor) ||
            !Number.isInteger(destinationFloor)
          ) {
            socket.emit("error", {
              success: false,
              error: "Floor numbers must be integers",
            });
            return;
          }

          // Validate floor numbers are positive
          if (originFloor <= 0 || destinationFloor <= 0) {
            socket.emit("error", {
              success: false,
              error: "Floor numbers must be positive",
            });
            return;
          }

          const request = elevatorSystem.addRequest(
            originFloor,
            destinationFloor
          );
          io.emit("request_added", {
            success: true,
            message: "Request added successfully",
            data: request,
          });
        } catch (error) {
          socket.emit("error", {
            success: false,
            error: "Failed to add request",
            details: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );

    // Get elevator state (equivalent to GET /elevator/:id)
    socket.on("get_elevator_state", (data: { elevatorId: number }) => {
      try {
        const { elevatorId } = data;

        if (typeof elevatorId !== "number" || isNaN(elevatorId)) {
          socket.emit("error", {
            success: false,
            error: "Invalid elevator ID",
          });
          return;
        }

        if (elevatorId < 0) {
          socket.emit("error", {
            success: false,
            error: "Elevator ID must be non-negative",
          });
          return;
        }

        const elevatorState = elevatorSystem.getElevatorState(elevatorId);

        if (!elevatorState) {
          socket.emit("error", {
            success: false,
            error: "Elevator not found",
          });
          return;
        }

        socket.emit("elevator_state_response", {
          success: true,
          data: elevatorState,
        });
      } catch (error) {
        socket.emit("error", {
          success: false,
          error: "Failed to get elevator state",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    socket.on("get_logs", (data?: { elevatorId?: number; limit?: number }) => {
      try {
        const elevatorId = data?.elevatorId;
        const limit = data?.limit || 5000;

        if (
          elevatorId !== undefined &&
          (typeof elevatorId !== "number" || elevatorId < 0)
        ) {
          socket.emit("error", {
            success: false,
            error: "Invalid elevator ID for logs",
          });
          return;
        }

        if (limit !== undefined && (typeof limit !== "number" || limit <= 0)) {
          socket.emit("error", {
            success: false,
            error: "Limit must be a positive number",
          });
          return;
        }

        const logs = elevatorSystem.getLogs(elevatorId, limit);
        socket.emit("logs", logs);
      } catch (error) {
        socket.emit("error", {
          success: false,
          error: "Failed to get logs",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    socket.on("get_stats", () => {
      try {
        const stats = elevatorSystem.getStats();
        socket.emit("stats_response", {
          success: true,
          data: stats,
        });
      } catch (error) {
        socket.emit("error", {
          success: false,
          error: "Failed to get statistics",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Generate random requests (additional feature)
    socket.on("generate_random_requests", (data: { num: number }) => {
      try {
        const { num } = data;

        if (typeof num !== "number" || num <= 0) {
          socket.emit("error", {
            success: false,
            error: "Number of requests must be a positive number",
          });
          return;
        }

        elevatorSystem.generateRandomRequest(num);
        io.emit("random_requests_generated", {
          success: true,
          message: `Generated ${num} random requests`,
          data: { numRequests: num },
        });
      } catch (error) {
        socket.emit("error", {
          success: false,
          error: "Failed to generate random requests",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Get system state (legacy event for backward compatibility)
    socket.on("get_system_state", () => {
      try {
        const systemState = elevatorSystem.getSystemState();
        socket.emit("system_state", systemState);
      } catch (error) {
        socket.emit("error", {
          success: false,
          error: "Failed to get system state",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
