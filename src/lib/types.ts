/**
 * Represents a passenger's request to use an elevator.
 * This is the core data structure that drives the entire simulation.
 */
export interface ElevatorRequest {
  /** Unique identifier for this request - helps us track it through the system */
  id: string;
  /** Floor where the passenger is waiting to be picked up */
  originFloor: number;
  /** Floor where the passenger wants to go */
  destinationFloor: number;
  /** When this request was created (Unix timestamp) */
  timestamp: number;
  /** Priority level - higher numbers mean more urgent requests */
  priority: number;
  /** Which elevator was assigned to handle this request (if any) */
  assignedElevator?: number;
  /** When the request was completed (Unix timestamp) */
  completedAt?: number;
}

/**
 * Current state of a single elevator in the system.
 * Tracks everything from position to passenger load.
 */
export interface ElevatorState {
  /** Unique elevator identifier (1-based indexing) */
  id: number;
  /** Current floor the elevator is on (or closest to if moving) */
  currentFloor: number;
  /** Floor the elevator is heading towards */
  targetFloor: number;
  /** Current movement direction - 'idle' means not moving */
  direction: "up" | "down" | "idle";
  /** Whether the elevator is currently in motion */
  isMoving: boolean;
  /** Maximum number of passengers this elevator can hold */
  capacity: number;
  /** Current number of passengers inside */
  currentLoad: number;
  /** All requests currently being handled by this elevator */
  requests: ElevatorRequest[];
  /** Requests where passengers are currently inside the elevator (picked up) */
  movingRequests: ElevatorRequest[];
  /** Last time this elevator performed an action (for idle detection) */
  lastActiveTime: number;
}

/**
 * Configuration settings for the elevator simulation.
 * These control the behavior and scale of the entire system.
 */
export interface SimulationConfig {
  /** How many elevators are in the building */
  numberOfElevators: number;
  /** Total number of floors in the building */
  numberOfFloors: number;
  /** How many passengers each elevator can carry at once */
  elevatorCapacity: number;
  /** How often new requests are generated (requests per second) */
  requestFrequency: number;
  /** Speed multiplier for the simulation (1.0 = real time) */
  simulationSpeed: number;
  /** Whether to simulate morning rush hour patterns */
  morningPeakBias: boolean;
}

/**
 * Statistics about the simulation's performance.
 * Used to measure efficiency and identify bottlenecks.
 */
export interface SimulationStats {
  /** Total number of requests that have been created */
  totalRequests: number;
  /** Number of requests that have been successfully completed */
  completedRequests: number;
  /** Maximum time passengers wait for an elevator (in milliseconds) */
  maxWaitTime: number;
  /** How busy each elevator is (percentage of time in use) */
  elevatorUtilization: number[];
  /** Number of requests currently waiting to be assigned */
  pendingRequests: number;
  /** Number of requests currently being transported (passengers inside elevators) */
  movingRequests: number;
}

/**
 * All the different events that can happen during simulation.
 * Used for logging and debugging the system behavior.
 */
export type LogEventType =
  | "system_initialized" // System startup
  | "simulation_started" // Simulation begins running
  | "simulation_stopped" // Simulation paused
  | "simulation_reset" // Simulation reset to initial state
  | "config_updated" // Configuration changed
  | "request_generated" // New passenger request created
  | "manual_request_added" // User manually added a request
  | "request_assigned" // Request assigned to an elevator
  | "passenger_picked_up" // Passenger entered elevator
  | "passenger_dropped_off" // Passenger left elevator
  | "priority_escalated" // Request priority increased
  | "repositioning" // Elevator moving to better position
  | "request_completed" // Request fully completed
  | "elevator_moved" // Elevator changed floors
  | "load_updated" // Elevator load changed
  | "idle_elevator_pickup" // Idle elevator picked up unassigned request
  | "request_reassigned" // Request reassigned from one elevator to another
  | "elevator_full" // Elevator is at capacity and cannot pick up more passengers
  | "error_occurred" // System error
  | "warning_issued"; // System warning

/**
 * A single log entry recording an event in the system.
 * Refactored to have cleaner structure with event, message, details, and optional elevatorId.
 */
export interface LogEntry {
  /** When this event occurred (Unix timestamp) */
  timestamp: number;
  /** What type of event this was */
  event: LogEventType;
  /** Human-readable message describing the event */
  message: string;
  /** Additional details about the event (varies by event type) */
  details: Record<string, unknown>;
  /** Which elevator was involved (optional for system-wide events) */
  elevatorId?: number;
}

/**
 * Complete state of the elevator system at any given moment.
 * This is what gets saved/loaded and used to render the UI.
 */
export interface SystemState {
  /** Whether the simulation is currently running */
  isRunning: boolean;
  /** Current configuration settings */
  config: SimulationConfig;
  /** State of all elevators in the system */
  elevators: ElevatorState[];
  /** Requests waiting to be assigned to an elevator */
  pendingRequests: ElevatorRequest[];
  /** Requests that have been completed */
  completedRequests: ElevatorRequest[];
  /** Current performance statistics */
  stats: SimulationStats;
}
