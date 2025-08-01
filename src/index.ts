import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { ElevatorSystem } from "./elevatorSystem";
import { SimulationConfig } from "./types";
import { createSocketRoutes } from "./socketRoutes";

const app = express();
const server = createServer(app);

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
});

const defaultConfig: SimulationConfig = {
  numberOfElevators: 4,
  numberOfFloors: 10,
  elevatorCapacity: 8,
  requestFrequency: 1,
  simulationSpeed: 1.0,
  morningPeakBias: false,
};

const elevatorSystem = new ElevatorSystem(defaultConfig, io);

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "Elevator Simulation Backend Server" });
});

// Initialize socket routes
createSocketRoutes(io, elevatorSystem);

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Elevator Simulation Server running on port ${PORT}`);
  console.log(`Socket.IO available at http://localhost:${PORT}`);
  console.log(`Health check at http://localhost:${PORT}/health`);
  console.log(
    `All elevator operations are now handled via WebSocket connections`
  );
});

process.on("SIGINT", () => {
  console.log("Shutting down gracefully...");
  elevatorSystem.stopSimulation();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export { app, server, io, elevatorSystem };
