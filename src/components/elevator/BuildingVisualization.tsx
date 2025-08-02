"use client";

import { SystemState } from "@/lib/types";
import { ElevatorSystem } from "./ElevatorSystem";

interface BuildingVisualizationProps {
  systemState: SystemState;
}

export function BuildingVisualization({
  systemState,
}: BuildingVisualizationProps) {
  const { elevators, config } = systemState;
  const { numberOfFloors, numberOfElevators } = config;

  return (
    <ElevatorSystem
      elevators={elevators}
      numberOfFloors={numberOfFloors}
      pendingRequests={systemState.pendingRequests}
    />
  );
}
