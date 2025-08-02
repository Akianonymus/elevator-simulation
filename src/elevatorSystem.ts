import { Server as SocketIOServer } from "socket.io";
import {
  ElevatorState,
  ElevatorRequest,
  SimulationConfig,
  SimulationStats,
  LogEntry,
  LogEventType,
  SystemState,
  LogMap,
} from "./types";

export class ElevatorSystem {
  private elevators: ElevatorState[] = [];
  private pendingRequests: Map<string, ElevatorRequest> = new Map();
  private completedRequests: Map<string, ElevatorRequest> = new Map();
  private config: SimulationConfig;
  private isRunning: boolean = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private requestGeneratorInterval: NodeJS.Timeout | null = null;
  private readonly MAX_LOG_ENTRIES = 5000;
  private logs: LogMap = new Map();
  private logCount: number = 0;
  private requestIdCounter: number = 0;
  private io: SocketIOServer;

  constructor(config: SimulationConfig, io: SocketIOServer) {
    this.io = io;
    this.validateConfig(config);
    this.config = config;
    this.initializeElevators();
    this.pendingRequests = new Map();
    this.completedRequests = new Map();
  }

  private validateConfig(config: SimulationConfig): void {
    if (config.numberOfElevators < 1) {
      throw new Error("Number of elevators must be at least 1");
    }
    if (config.numberOfFloors < 2) {
      throw new Error("Number of floors must be at least 2");
    }
    if (config.elevatorCapacity < 1) {
      throw new Error("Elevator capacity must be at least 1");
    }
    if (config.requestFrequency <= 0) {
      throw new Error("Request frequency must be positive");
    }
    if (config.simulationSpeed <= 0) {
      throw new Error("Simulation speed must be positive");
    }
  }

  private initializeElevators(): void {
    this.elevators = [];
    for (let i = 0; i < this.config.numberOfElevators; i++) {
      this.elevators.push({
        id: i,
        currentFloor: 1,
        targetFloor: 1,
        direction: "idle",
        isMoving: false,
        capacity: this.config.elevatorCapacity,
        currentLoad: 0,
        requests: [],
        movingRequests: [],
        lastActiveTime: Date.now(),
      });
    }
    this.log("system_initialized", "Elevator system initialized", {
      elevatorCount: this.config.numberOfElevators,
    });
  }

  public startSimulation(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Ensure simulation speed is within reasonable bounds to prevent division by zero
    const safeSimulationSpeed = Math.max(
      0.1,
      Math.min(10.0, this.config.simulationSpeed)
    );

    // Convert simulation speed to milliseconds per floor movement
    // simulationSpeed 1.0 = 1 second per floor = 1000ms per floor
    const simulationInterval = Math.max(
      50, // Minimum 50ms for responsiveness
      Math.floor(1000 / safeSimulationSpeed)
    );

    const requestInterval = Math.max(
      1000,
      Math.floor(60000 / this.config.requestFrequency)
    );

    const runSimulationStep = () => {
      if (!this.isRunning) return;

      try {
        // Validate system state before processing
        this.validateSystem("strict");

        // Process requests first to ensure proper assignment
        this.assignPendingRequests();

        // Update elevator states and handle floor arrivals
        this.updateAllElevators();

        // Update priorities for long-waiting requests
        this.escalateRequestPriorities();

        // Validate system state after processing
        this.validateSystem("strict");

        // Emit system state update
        this.io.emit("system_state", this.getSystemState());

        this.simulationInterval = setTimeout(
          runSimulationStep,
          simulationInterval
        );
      } catch (error) {
        this.log(
          "error_occurred",
          `Simulation step error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          }
        );

        // Continue simulation even if there's an error
        this.simulationInterval = setTimeout(
          runSimulationStep,
          simulationInterval
        );
      }
    };
    runSimulationStep();

    this.requestGeneratorInterval = setInterval(() => {
      this.generateRandomRequest();
    }, requestInterval);

    this.log("simulation_started", "Simulation started", {
      config: this.config,
    });
  }

  public stopSimulation(): void {
    this.isRunning = false;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    if (this.requestGeneratorInterval) {
      clearInterval(this.requestGeneratorInterval);
      this.requestGeneratorInterval = null;
    }

    this.log("simulation_stopped", "Simulation stopped", {});
  }

  public resetSimulation(): void {
    this.stopSimulation();
    this.pendingRequests = new Map();
    this.completedRequests = new Map();
    this.logs = new Map();
    this.logCount = 0;
    this.requestIdCounter = 0;
    this.initializeElevators();
    this.log("simulation_reset", "Simulation reset", {});
  }

  public updateConfig(newConfig: Partial<SimulationConfig>): void {
    if (
      newConfig.elevatorCapacity !== undefined &&
      newConfig.elevatorCapacity < 1
    ) {
      throw new Error("Elevator capacity must be at least 1");
    }
    if (
      newConfig.requestFrequency !== undefined &&
      newConfig.requestFrequency <= 0
    ) {
      throw new Error("Request frequency must be positive");
    }
    if (
      newConfig.simulationSpeed !== undefined &&
      newConfig.simulationSpeed <= 0
    ) {
      throw new Error("Simulation speed must be positive");
    }

    const wasRunning = this.isRunning;
    if (wasRunning) this.stopSimulation();

    this.config = { ...this.config, ...newConfig };

    if (
      newConfig.numberOfElevators !== undefined ||
      newConfig.numberOfFloors !== undefined
    ) {
      this.log("config_updated", "Configuration updated", { newConfig });
      this.initializeElevators();
    }

    if (wasRunning) {
      this.startSimulation();
    }
  }

  public generateRandomRequest(
    num = 1,
    delay = 100
  ): ElevatorRequest | ElevatorRequest[] {
    if (num === 1) {
      return this.generateSingleRandomRequest();
    }

    const requests: ElevatorRequest[] = [];
    let generatedCount = 0;

    const generateNext = () => {
      if (generatedCount < num) {
        const request = this.generateSingleRandomRequest();
        requests.push(request);
        generatedCount++;

        if (generatedCount < num) {
          setTimeout(generateNext, delay);
        }
      }
    };

    generateNext();
    return requests;
  }

  private generateSingleRandomRequest(): ElevatorRequest {
    const isMorningPeak = this.config.morningPeakBias;

    let originFloor: number;
    let destinationFloor: number;

    if (isMorningPeak && Math.random() < 0.7) {
      originFloor = 1;
      destinationFloor =
        Math.floor(Math.random() * (this.config.numberOfFloors - 1)) + 2;
    } else {
      originFloor = Math.floor(Math.random() * this.config.numberOfFloors) + 1;
      do {
        destinationFloor =
          Math.floor(Math.random() * this.config.numberOfFloors) + 1;
      } while (destinationFloor === originFloor);
    }

    const request: ElevatorRequest = {
      id: `req_${++this.requestIdCounter}`,
      originFloor,
      destinationFloor,
      timestamp: Date.now(),
      priority: 1,
    };

    this.pendingRequests.set(request.id, request);

    this.log(
      "request_generated",
      `Random request ${request.id} generated from floor ${originFloor} to ${destinationFloor}`,
      {
        request,
        pendingRequestsCount: this.pendingRequests.size,
        completedRequestsCount: this.completedRequests.size,
        isMorningPeak,
        elevatorStates: this.elevators.map((e) => ({
          id: e.id,
          currentFloor: e.currentFloor,
          direction: e.direction,
          isMoving: e.isMoving,
          currentLoad: e.currentLoad,
          capacity: e.capacity,
        })),
      }
    );

    return request;
  }

  public addRequest(
    originFloor: number,
    destinationFloor: number
  ): ElevatorRequest {
    if (!Number.isInteger(originFloor) || !Number.isInteger(destinationFloor)) {
      throw new Error("Floor numbers must be integers");
    }

    if (
      originFloor < 1 ||
      originFloor > this.config.numberOfFloors ||
      destinationFloor < 1 ||
      destinationFloor > this.config.numberOfFloors
    ) {
      throw new Error(
        `Floor numbers must be between 1 and ${this.config.numberOfFloors}`
      );
    }

    if (originFloor === destinationFloor) {
      throw new Error("Origin and destination floors cannot be the same");
    }

    const request: ElevatorRequest = {
      id: `req_${++this.requestIdCounter}`,
      originFloor,
      destinationFloor,
      timestamp: Date.now(),
      priority: 1,
    };

    this.pendingRequests.set(request.id, request);

    this.log("manual_request_added", "Manual request added", {
      request,
      pendingRequestsCount: this.pendingRequests.size,
      completedRequestsCount: this.completedRequests.size,
    });

    return request;
  }

  private assignPendingRequests(): void {
    // Get unassigned requests, sorted by timestamp (oldest first)
    const unassignedRequests = Array.from(this.pendingRequests.values())
      .filter((request) => request.assignedElevator === undefined)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Track which elevators have been assigned requests in this cycle to prevent conflicts
    const assignedElevators = new Set<number>();

    for (const request of unassignedRequests) {
      // Skip if request is no longer in pending (may have been picked up)
      if (!this.pendingRequests.has(request.id)) {
        continue;
      }

      const optimalElevatorId = this.findOptimalElevator(request);

      if (optimalElevatorId !== null) {
        // Check if this elevator has already been assigned a request in this cycle
        // This prevents multiple requests from being assigned to the same elevator simultaneously
        if (assignedElevators.has(optimalElevatorId)) {
          // Try to find another suitable elevator
          const alternativeElevatorIndex = this.findOptimalElevator(
            request,
            optimalElevatorId
          );
          if (alternativeElevatorIndex !== null) {
            this.assignRequestToElevator(request, alternativeElevatorIndex);
            assignedElevators.add(alternativeElevatorIndex);
          }
        } else {
          this.assignRequestToElevator(request, optimalElevatorId);
          assignedElevators.add(optimalElevatorId);
        }
      }
    }
  }

  private findOptimalElevator(
    request: ElevatorRequest,
    excludeElevatorId?: number
  ): number | null {
    let optimalElevatorId: number | null = null;
    let lowestFitnessScore = Infinity;

    for (let i = 0; i < this.elevators.length; i++) {
      // Skip the excluded elevator if specified
      if (excludeElevatorId !== undefined && i === excludeElevatorId) continue;

      const elevator = this.elevators[i];
      if (!elevator) continue;

      // Check if elevator is at capacity
      if (elevator.currentLoad >= elevator.capacity) continue;

      // Consider idle elevators
      if (elevator.direction === "idle" && !elevator.isMoving) {
        const fitnessScore = this.calculateElevatorFitness(elevator, request);
        if (fitnessScore < lowestFitnessScore) {
          lowestFitnessScore = fitnessScore;
          optimalElevatorId = i;
        }
        continue;
      }

      // Consider moving elevators that are heading toward the request's origin floor
      if (elevator.isMoving) {
        const isHeadingTowardRequest = this.isElevatorMovingTowardFloor(
          elevator,
          request.originFloor
        );

        if (isHeadingTowardRequest) {
          const fitnessScore = this.calculateElevatorFitness(elevator, request);
          if (fitnessScore < lowestFitnessScore) {
            lowestFitnessScore = fitnessScore;
            optimalElevatorId = i;
          }
        }
      }
    }

    return optimalElevatorId;
  }

  private isElevatorMovingTowardFloor(
    elevator: ElevatorState,
    targetFloor: number
  ): boolean {
    if (elevator.direction === "up") {
      return targetFloor > elevator.currentFloor;
    } else if (elevator.direction === "down") {
      return targetFloor < elevator.currentFloor;
    }
    return false;
  }

  private calculateElevatorFitness(
    elevator: ElevatorState,
    request: ElevatorRequest
  ): number {
    const distance = Math.abs(elevator.currentFloor - request.originFloor);
    const loadFactor = elevator.currentLoad / elevator.capacity;
    const directionBonus = this.calculateDirectionBonus(elevator, request);

    let fitnessScore = distance + loadFactor * 10 - directionBonus;

    fitnessScore -= (request.priority - 1) * 5;

    return fitnessScore;
  }

  private calculateDirectionBonus(
    elevator: ElevatorState,
    request: ElevatorRequest
  ): number {
    if (elevator.direction === "idle") return 2;

    const requestDirection =
      request.destinationFloor > request.originFloor ? "up" : "down";
    const elevatorMovingToward =
      (elevator.direction === "up" &&
        request.originFloor > elevator.currentFloor) ||
      (elevator.direction === "down" &&
        request.originFloor < elevator.currentFloor);

    if (elevator.direction === requestDirection && elevatorMovingToward) {
      return 5;
    }

    return 0;
  }

  private assignRequestToElevator(
    request: ElevatorRequest,
    elevatorId: number
  ): void {
    if (elevatorId < 0 || elevatorId >= this.elevators.length) {
      throw new Error(`Invalid elevator ID: ${elevatorId}`);
    }
    const elevator = this.elevators[elevatorId];

    if (!elevator) {
      throw new Error(`Elevator ${elevatorId} not found`);
    }

    this.handleRequestStateChange(request, elevator, "assign");
  }

  private updateAllElevators(): void {
    for (const elevator of this.elevators) {
      this.updateElevatorPosition(elevator);
    }
  }

  private updateElevatorPosition(elevator: ElevatorState): void {
    if (!elevator.isMoving) return;

    if (elevator.currentFloor < elevator.targetFloor) {
      elevator.currentFloor++;
      elevator.direction = "up";
    } else if (elevator.currentFloor > elevator.targetFloor) {
      elevator.currentFloor--;
      elevator.direction = "down";
    }

    this.handleElevatorFloorArrival(elevator);

    this.calculateNextElevatorTarget(elevator);
  }

  private handleElevatorFloorArrival(elevator: ElevatorState): void {
    const currentFloor = elevator.currentFloor;

    // Handle passengers getting off at current floor
    const droppingOff = elevator.movingRequests.filter(
      (req) =>
        req.destinationFloor === currentFloor &&
        req.assignedElevator === elevator.id
    );

    for (const request of droppingOff) {
      this.handleRequestStateChange(request, elevator, "complete");
    }

    // Handle passengers getting on at current floor
    // Get all requests assigned to this elevator that are waiting at this floor
    const pickingUp = elevator.requests.filter(
      (req) =>
        req.originFloor === currentFloor &&
        req.assignedElevator === elevator.id &&
        !elevator.movingRequests.find(
          (movingRequest) => movingRequest.id === req.id
        ) // Not already picked up
    );

    for (const request of pickingUp) {
      // Check if elevator has capacity
      if (elevator.currentLoad >= elevator.capacity) {
        // this.log(
        //   "elevator_full",
        //   `Elevator ${elevator.id} is at capacity, cannot pick up passenger ${request.id}`,
        //   {
        //     requestId: request.id,
        //     floor: currentFloor,
        //     currentLoad: elevator.currentLoad,
        //     capacity: elevator.capacity,
        //   },
        //   elevator.id
        // );
        continue;
      }

      this.handleRequestStateChange(request, elevator, "pickup");
    }

    // Ensure load consistency - currentLoad should always match the number of moving requests
    elevator.currentLoad = Math.min(
      elevator.capacity,
      elevator.movingRequests.length
    );

    // Validate state consistency
    this.validateElevatorState(elevator);
  }

  private validateElevatorState(elevator: ElevatorState): void {
    // Validate load consistency
    if (elevator.currentLoad !== elevator.movingRequests.length) {
      this.log(
        "warning_issued",
        `Load inconsistency detected in elevator ${elevator.id}: currentLoad=${elevator.currentLoad}, movingRequests=${elevator.movingRequests.length}`,
        {
          elevatorId: elevator.id,
          currentLoad: elevator.currentLoad,
          movingRequestsCount: elevator.movingRequests.length,
          requestsCount: elevator.requests.length,
        },
        elevator.id
      );

      // Auto-correct the load
      elevator.currentLoad = elevator.movingRequests.length;
    }

    // Validate capacity limits
    if (elevator.currentLoad > elevator.capacity) {
      this.log(
        "error_occurred",
        `Elevator ${elevator.id} overloaded: ${elevator.currentLoad} > ${elevator.capacity}`,
        {
          elevatorId: elevator.id,
          currentLoad: elevator.currentLoad,
          capacity: elevator.capacity,
        },
        elevator.id
      );

      // Auto-correct by limiting to capacity
      elevator.currentLoad = elevator.capacity;
    }
  }

  private handleRequestStateChange(
    request: ElevatorRequest,
    elevator: ElevatorState,
    operation: "pickup" | "dropoff" | "assign" | "complete"
  ): void {
    switch (operation) {
      case "pickup":
        // Remove from pending requests
        this.pendingRequests.delete(request.id);

        // Move to movingRequests when passenger is actually picked up
        if (!elevator.movingRequests.find((req) => req.id === request.id)) {
          elevator.movingRequests.push(request);
          // Increment load when passenger is actually picked up
          elevator.currentLoad = Math.min(
            elevator.capacity,
            elevator.currentLoad + 1
          );
        }

        this.log(
          "passenger_picked_up",
          `Elevator ${elevator.id} picked up passenger at floor ${elevator.currentFloor} for ${request.id}`,
          {
            requestId: request.id,
            floor: elevator.currentFloor,
            destination: request.destinationFloor,
            elevatorLoad: elevator.currentLoad,
            elevatorCapacity: elevator.capacity,
          },
          elevator.id
        );
        break;

      case "dropoff":
        // Remove from both requests and movingRequests
        elevator.requests = elevator.requests.filter(
          (req) => req.id !== request.id
        );
        elevator.movingRequests = elevator.movingRequests.filter(
          (req) => req.id !== request.id
        );
        elevator.currentLoad = Math.max(0, elevator.currentLoad - 1);

        // Set the completion time for metrics calculation
        request.completedAt = Date.now();
        this.completedRequests.set(request.id, request);

        this.pendingRequests.delete(request.id);

        this.log(
          "passenger_dropped_off",
          `Elevator ${elevator.id} dropped off passenger at floor ${elevator.currentFloor} for ${request.id}`,
          {
            requestId: request.id,
            floor: elevator.currentFloor,
            waitTime: Date.now() - request.timestamp,
          },
          elevator.id
        );

        this.log(
          "request_completed",
          `Request ${request.id} completed`,
          {
            requestId: request.id,
            originFloor: request.originFloor,
            destinationFloor: request.destinationFloor,
            elevatorId: elevator.id,
            completionTime: Date.now(),
            totalWaitTime: Date.now() - request.timestamp,
            totalDistance: Math.abs(
              request.destinationFloor - request.originFloor
            ),
          },
          elevator.id
        );
        break;

      case "assign":
        // Check if request is already assigned to this elevator
        if (request.assignedElevator === elevator.id) {
          return; // Already assigned, no need to reassign
        }

        // If request was assigned to another elevator, remove it from that elevator's requests
        if (
          request.assignedElevator !== undefined &&
          request.assignedElevator !== elevator.id
        ) {
          const previousElevator = this.elevators[request.assignedElevator];
          if (previousElevator) {
            previousElevator.requests = previousElevator.requests.filter(
              (req) => req.id !== request.id
            );
            previousElevator.movingRequests =
              previousElevator.movingRequests.filter(
                (req) => req.id !== request.id
              );
          }
        }

        // Assign request to this elevator
        request.assignedElevator = elevator.id;

        // Add to elevator's requests array immediately for proper tracking
        if (!elevator.requests.find((req) => req.id === request.id)) {
          elevator.requests.push(request);
        }

        // Update elevator target and direction if idle
        if (elevator.direction === "idle") {
          elevator.targetFloor = request.originFloor;
          elevator.direction =
            request.originFloor > elevator.currentFloor ? "up" : "down";
          elevator.isMoving = true;
        }

        this.log(
          "request_assigned",
          `Request ${request.id} assigned to elevator ${elevator.id}`,
          {
            requestId: request.id,
            originFloor: request.originFloor,
            destinationFloor: request.destinationFloor,
            elevatorId: elevator.id,
          },
          elevator.id
        );
        break;

      case "complete":
        // This is the same as dropoff, but kept for semantic clarity
        this.handleRequestStateChange(request, elevator, "dropoff");
        break;
    }
  }

  private calculateNextElevatorTarget(elevator: ElevatorState): void {
    // Get all requests assigned to this elevator
    const assignedRequests = elevator.requests.filter(
      (request) => request.assignedElevator === elevator.id
    );
    const inTransitRequests = elevator.movingRequests.filter(
      (request) => request.assignedElevator === elevator.id
    );

    if (assignedRequests.length === 0) {
      elevator.isMoving = false;
      elevator.direction = "idle";
      elevator.targetFloor = elevator.currentFloor;
      elevator.lastActiveTime = Date.now();

      // Check for unassigned requests when elevator becomes idle
      this.assignRequestsToIdleElevator(elevator);
      return;
    }

    // Prioritize dropoffs (inTransitRequests) over pickups (assignedRequests)
    const dropoffFloors = inTransitRequests.map(
      (request) => request.destinationFloor
    );
    const pickupFloors = assignedRequests
      .filter(
        (request) =>
          !inTransitRequests.find(
            (inTransitRequest) => inTransitRequest.id === request.id
          )
      )
      .map((request) => request.originFloor);

    const requestedFloors = [...dropoffFloors, ...pickupFloors];

    if (requestedFloors.length === 0) {
      // No valid targets, elevator should become idle
      elevator.isMoving = false;
      elevator.direction = "idle";
      elevator.targetFloor = elevator.currentFloor;
      return;
    }

    let nextTargetFloor: number = elevator.currentFloor; // Default to current floor

    if (elevator.direction === "up") {
      const floorsAbove = requestedFloors
        .filter((floor) => floor > elevator.currentFloor)
        .sort((a, b) => a - b);

      if (floorsAbove.length > 0) {
        nextTargetFloor = floorsAbove[0] || elevator.currentFloor;
      } else {
        // No floors above, change direction to down
        const floorsBelow = requestedFloors
          .filter((floor) => floor < elevator.currentFloor)
          .sort((a, b) => b - a);

        nextTargetFloor =
          floorsBelow.length > 0
            ? floorsBelow[0] || elevator.currentFloor
            : elevator.currentFloor;
      }
    } else if (elevator.direction === "down") {
      const floorsBelow = requestedFloors
        .filter((floor) => floor < elevator.currentFloor)
        .sort((a, b) => b - a);

      if (floorsBelow.length > 0) {
        nextTargetFloor = floorsBelow[0] || elevator.currentFloor;
      } else {
        // No floors below, change direction to up
        const floorsAbove = requestedFloors
          .filter((floor) => floor > elevator.currentFloor)
          .sort((a, b) => a - b);

        nextTargetFloor =
          floorsAbove.length > 0
            ? floorsAbove[0] || elevator.currentFloor
            : elevator.currentFloor;
      }
    } else {
      // Elevator is idle, find nearest floor
      const requestedFloors = assignedRequests
        .map((request) => [request.originFloor, request.destinationFloor])
        .flat();

      if (requestedFloors.length === 0) {
        nextTargetFloor = elevator.currentFloor;
      } else {
        nextTargetFloor = requestedFloors.reduce((nearest, floor) =>
          Math.abs(floor - elevator.currentFloor) <
          Math.abs(nearest - elevator.currentFloor)
            ? floor
            : nearest
        );
      }
    }

    elevator.targetFloor = nextTargetFloor;
    elevator.direction =
      nextTargetFloor > elevator.currentFloor
        ? "up"
        : nextTargetFloor < elevator.currentFloor
        ? "down"
        : "idle";
    elevator.isMoving = elevator.direction !== "idle";

    // Log target updates for debugging
    if (elevator.isMoving) {
      // this.log(
      //   "elevator_moved",
      //   `Elevator ${elevator.id} moved to floor ${elevator.currentFloor} | Target: ${nextTarget} | ${elevator.direction}`,
      //   {
      //     elevatorId: elevator.id,
      //     currentFloor: elevator.currentFloor,
      //     targetFloor: nextTarget,
      //     direction: elevator.direction,
      //     activeRequests: activeRequests.length,
      //     movingRequests: movingRequests.length,
      //   },
      //   elevator.id
      // );
    }
  }

  // Check for available requests when elevator becomes idle
  private assignRequestsToIdleElevator(elevator: ElevatorState): void {
    // Get all requests that are not being handled by moving elevators
    const availableRequests = Array.from(this.pendingRequests.values())
      .filter((request) => {
        // If request is unassigned, it's available
        if (request.assignedElevator === undefined) {
          return true;
        }

        // If request is assigned, check if the assigned elevator is moving
        const assignedElevator = this.elevators[request.assignedElevator];
        if (assignedElevator === undefined) {
          return true; // If assigned elevator doesn't exist, consider it available
        }

        // only reassign requests which are not inside a moving elavator
        if (assignedElevator.id === elevator.id && !elevator.isMoving) {
          return true;
        }

        // Request is available if assigned elevator is not moving (idle or stationary)
        return false;
      })
      .sort((a, b) => {
        // Calculate combined score considering both priority and elevator efficiency
        const scoreA = this.calculateElevatorFitness(elevator, a);
        const scoreB = this.calculateElevatorFitness(elevator, b);

        // Final score = elevator score + priority bonus
        const finalScoreA = scoreA + a.priority;
        const finalScoreB = scoreB + b.priority;

        return finalScoreA - finalScoreB;
      });

    // Find the highest priority request that this elevator can handle
    for (const request of availableRequests) {
      if (elevator.currentLoad < elevator.capacity) {
        // If request was already assigned to another elevator, unassign it first
        if (
          request.assignedElevator !== undefined &&
          request.assignedElevator !== elevator.id
        ) {
          this.log(
            "request_reassigned",
            `Request ${request.id} reassigned from elevator ${request.assignedElevator} to idle elevator ${elevator.id}`,
            {
              requestId: request.id,
              oldElevatorId: request.assignedElevator,
              newElevatorId: elevator.id,
              priority: request.priority,
            },
            elevator.id
          );
        }

        this.assignRequestToElevator(request, elevator.id);
        this.log(
          "idle_elevator_pickup",
          `Idle elevator ${elevator.id} picked up request ${request.id} with priority ${request.priority}`,
          {
            requestId: request.id,
            elevatorId: elevator.id,
            priority: request.priority,
            originFloor: request.originFloor,
            destinationFloor: request.destinationFloor,
          },
          elevator.id
        );
        break; // Only pick up one request at a time to avoid overwhelming the elevator
      }
    }
  }

  private escalateRequestPriorities(): void {
    const now = Date.now();
    const PRIORITY_ESCALATION_THRESHOLD_MS = 30 * 1000;

    for (const request of Array.from(this.pendingRequests.values())) {
      if (now - request.timestamp > PRIORITY_ESCALATION_THRESHOLD_MS) {
        const oldPriority = request.priority;
        request.priority = Math.min(100, request.priority + 1);

        if (request.priority > oldPriority) {
          this.log(
            "priority_escalated",
            `Request ${request.id} priority escalated to ${request.priority}`,
            {
              requestId: request.id,
              newPriority: request.priority,
              waitTime: now - request.timestamp,
            }
          );
        }
      }
    }
  }

  public getStats(): SimulationStats {
    const now = Date.now();

    // Calculate current wait times for requests that are still waiting (not yet picked up)
    // This includes both unassigned requests and assigned requests that haven't been picked up yet
    const waitingRequests = Array.from(this.pendingRequests.values()).filter(
      (request) => {
        // If request is unassigned, it's waiting for assignment
        if (request.assignedElevator === undefined) {
          return true;
        }

        // If request is assigned, check if the assigned elevator exists
        const assignedElevator = this.elevators[request.assignedElevator];
        if (!assignedElevator) {
          return true; // If assigned elevator doesn't exist, consider it waiting
        }

        // Exclude requests that are currently being transported (in moving elevator)
        if (assignedElevator.movingRequests.some((v) => v.id === request.id)) {
          return false;
        }

        // Include all other assigned requests (waiting to be picked up)
        return true;
      }
    );
    const pendingWaitTimes = waitingRequests.map(
      (request) => now - request.timestamp
    );

    // Max wait time should be for requests that are still waiting (not yet picked up)
    const maxWaitTime =
      pendingWaitTimes.length > 0 ? Math.max(...pendingWaitTimes) : 0;

    // Calculate time-based utilization for each elevator
    const elevatorUtilization = this.elevators.map((elevator) => {
      // Check if elevator has any assigned requests (pending or active)
      const hasAssignedRequests = Array.from(
        this.pendingRequests.values()
      ).some((request) => request.assignedElevator === elevator.id);

      // Elevator is utilized if it's moving, has passengers, or has assigned requests
      const isUtilized =
        elevator.isMoving || elevator.currentLoad > 0 || hasAssignedRequests;

      if (isUtilized) {
        // If elevator is moving or has passengers, show actual load utilization
        if (elevator.isMoving || elevator.currentLoad > 0) {
          return elevator.currentLoad / elevator.capacity;
        } else {
          // If elevator has assigned requests but is not yet moving, show minimal utilization
          return 0.1; // 10% utilization to indicate it's assigned but not yet active
        }
      } else {
        // If idle and no passengers, utilization is 0
        return 0;
      }
    });

    // Calculate total moving requests across all elevators
    const totalMovingRequests = this.elevators.reduce(
      (total, elevator) => total + elevator.movingRequests.length,
      0
    );

    return {
      totalRequests: this.completedRequests.size + this.pendingRequests.size,
      completedRequests: this.completedRequests.size,
      maxWaitTime,
      elevatorUtilization,
      pendingRequests: this.pendingRequests.size,
      movingRequests: totalMovingRequests,
    };
  }

  public getSystemState(): SystemState {
    return {
      isRunning: this.isRunning,
      config: this.config,
      elevators: [...this.elevators],
      pendingRequests: Array.from(this.pendingRequests.values()),
      completedRequests: Array.from(this.completedRequests.values()),
      stats: this.getStats(),
      // logs: this.getLogs(undefined, 1000), // Removed - logs are now sent via separate new_log events
    };
  }

  public getElevatorState(elevatorId: number): ElevatorState | null {
    if (!Number.isInteger(elevatorId) || elevatorId < 0) {
      throw new Error("Elevator ID must be a non-negative integer");
    }

    if (elevatorId >= this.elevators.length) {
      return null;
    }

    return this.elevators[elevatorId] || null;
  }

  private log(
    event: LogEventType,
    message: string,
    details: Record<string, unknown>,
    elevatorId?: number
  ): void {
    const logEntry: LogEntry = {
      timestamp: Date.now(),
      event,
      message,
      details,
      elevatorId,
    };

    // Create unique key from event and message
    const key = `${event}:${message}-${logEntry.timestamp}`;

    // Check if we need to remove oldest entry to maintain capacity
    if (this.logs.size >= this.MAX_LOG_ENTRIES) {
      // Find and remove the oldest entry
      let oldestKey: string | null = null;
      let oldestTimestamp = Infinity;

      for (const [mapKey, entry] of this.logs.entries()) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
          oldestKey = mapKey;
        }
      }

      if (oldestKey) {
        this.logs.delete(oldestKey);
      }
    }

    // Add the new log entry
    this.logs.set(key, logEntry);
    this.logCount++;

    // Emit the new log entry to all connected clients
    this.io.emit("new_log", logEntry);
  }

  public getLogs(elevatorId?: number, limit: number = 1000): LogEntry[] {
    // Convert map to array and sort by timestamp
    const logsArray = Array.from(this.logs.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // Filter by elevator ID if specified
    let filteredLogs =
      elevatorId !== undefined
        ? logsArray.filter((log) => log.elevatorId === elevatorId)
        : logsArray;

    // Return the most recent logs up to the limit
    return filteredLogs.slice(-limit);
  }

  public isSystemRunning(): boolean {
    return this.isRunning;
  }

  private validateSystem(
    validationLevel: "basic" | "strict" | "debug" = "basic"
  ): void {
    // Always validate elevator states
    this.validateElevators();

    // Validate requests for strict and debug levels
    if (validationLevel === "strict" || validationLevel === "debug") {
      this.validateRequests();
    }

    // Validate consistency for debug level only
    if (validationLevel === "debug") {
      this.validateConsistency();
    }
  }

  private validateElevators(): void {
    for (const elevator of this.elevators) {
      this.validateElevatorState(elevator);
    }
  }

  private validateRequests(): void {
    const requestIds = new Set<string>();

    // Check for duplicate requests in pending
    for (const request of this.pendingRequests.values()) {
      if (requestIds.has(request.id)) {
        this.log(
          "error_occurred",
          `Duplicate request found in pending: ${request.id}`,
          { requestId: request.id }
        );
      }
      requestIds.add(request.id);
    }

    // Check for requests that are both pending and completed
    for (const request of this.completedRequests.values()) {
      if (this.pendingRequests.has(request.id)) {
        this.log(
          "error_occurred",
          `Request ${request.id} exists in both pending and completed`,
          { requestId: request.id }
        );
        // Auto-correct by removing from pending
        this.pendingRequests.delete(request.id);
      }
    }
  }

  private validateConsistency(): void {
    // Validate elevator request assignments
    for (const elevator of this.elevators) {
      for (const request of elevator.requests) {
        if (request.assignedElevator !== elevator.id) {
          this.log(
            "error_occurred",
            `Request ${request.id} in elevator ${elevator.id} but assigned to elevator ${request.assignedElevator}`,
            {
              requestId: request.id,
              elevatorId: elevator.id,
              assignedElevator: request.assignedElevator,
            }
          );
        }
      }
    }
  }
}
