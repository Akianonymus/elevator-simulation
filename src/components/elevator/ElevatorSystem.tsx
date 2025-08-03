"use client";

import { ElevatorState, ElevatorRequest } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useElevatorStore } from "@/store/elevatorStore";
import { useRef, useEffect, useState, useMemo, useCallback, memo } from "react";
import { FloorButton } from "./FloorButton";
import { VirtualFloorList } from "./VirtualFloorList";

interface ElevatorSystemProps {
  elevators: ElevatorState[];
  numberOfFloors: number;
  pendingRequests: ElevatorRequest[];
}

// Memoized Elevator Shaft Component
const ElevatorShaft = memo(
  ({
    elevator,
    numberOfFloors,
    containerHeight,
  }: {
    elevator: ElevatorState;
    numberOfFloors: number;
    containerHeight: number;
  }) => {
    // Memoize elevator styling calculations
    const elevatorColor = useMemo(() => {
      if (!elevator.isMoving) return "bg-slate-400 dark:bg-slate-600";
      if (elevator.direction === "up")
        return "bg-emerald-500 dark:bg-emerald-600";
      if (elevator.direction === "down")
        return "bg-orange-500 dark:bg-orange-600";
      return "bg-blue-500 dark:bg-blue-600";
    }, [elevator.isMoving, elevator.direction]);

    const directionIcon = useMemo(() => {
      if (!elevator.isMoving) return <Minus className="h-3 w-3" />;
      if (elevator.direction === "up") return <ArrowUp className="h-3 w-3" />;
      return <ArrowDown className="h-3 w-3" />;
    }, [elevator.isMoving, elevator.direction]);

    // Memoize floor positions
    const floorPositions = useMemo(() => {
      return Array.from({ length: numberOfFloors }, (_, i) => {
        const floor = numberOfFloors - i;
        const isTargetFloor =
          elevator.isMoving && elevator.targetFloor === floor;
        return {
          floor,
          isTargetFloor,
          bottom: `${(floor - 1) * (containerHeight / numberOfFloors)}px`,
        };
      });
    }, [
      numberOfFloors,
      containerHeight,
      elevator.isMoving,
      elevator.targetFloor,
    ]);

    const elevatorPosition = useMemo(
      () => ({
        bottom: `${
          (elevator.currentFloor - 1) * (containerHeight / numberOfFloors)
        }px`,
      }),
      [elevator.currentFloor, containerHeight, numberOfFloors]
    );

    return (
      <div className="flex items-center gap-2">
        <div className="relative w-24 flex gap-4 justify-center rounded mt-auto">
          {/* Floor Numbers */}
          {floorPositions.map(({ floor, isTargetFloor, bottom }) => (
            <div
              key={floor}
              className={`absolute h-10 w-24 text-xs text-muted-foreground font-mono border-2 text-center ${
                isTargetFloor
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              style={{ bottom }}
            >
              {floor}
            </div>
          ))}

          {/* Elevator */}
          <div
            className={`absolute h-10 w-24 ${elevatorColor} rounded border-2 border-white dark:border-slate-800 shadow-lg transition-all duration-100 flex items-center justify-center text-white font-bold text-xs`}
            style={elevatorPosition}
          >
            {directionIcon}
          </div>
        </div>
      </div>
    );
  }
);

ElevatorShaft.displayName = "ElevatorShaft";

// Memoized Elevator Info Component
const ElevatorInfo = memo(({ elevator }: { elevator: ElevatorState }) => {
  const loadPercentage = useMemo(
    () => (elevator.currentLoad / elevator.capacity) * 100,
    [elevator.currentLoad, elevator.capacity]
  );

  const waitingRequests = useMemo(
    () => elevator.requests.length - (elevator.movingRequests?.length || 0),
    [elevator.requests.length, elevator.movingRequests?.length]
  );

  const nextDestinations = useMemo(
    () =>
      elevator.requests
        .slice(0, 2)
        .map((req) => req.destinationFloor)
        .reverse()
        .join(", "),
    [elevator.requests]
  );

  return (
    <div className="flex flex-col w-24 items-center gap-2 h-full">
      <div className="text-center flex-shrink-0">
        <div className="font-bold text-sm">Elevator {elevator.id + 1}</div>
        <div className="text-xs text-muted-foreground">
          Floor {elevator.currentFloor}
        </div>

        {/* Target floor info */}
        {elevator.isMoving && (
          <div className="text-xs text-blue-600 dark:text-blue-400">
            → Floor {elevator.targetFloor}
          </div>
        )}

        {/* Enhanced load display */}
        <div className="text-xs text-muted-foreground">
          {elevator.currentLoad}/{elevator.capacity} passengers
        </div>

        {/* Load percentage bar */}
        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
          <div
            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
            style={{ width: `${loadPercentage}%` }}
          />
        </div>

        {/* Request breakdown */}
        <div className="text-xs mt-1">
          <div className="text-green-600">
            {elevator.movingRequests?.length || 0} inside
          </div>
          <div className="text-orange-600">{waitingRequests} waiting</div>
        </div>

        {/* Next destinations */}
        {elevator.requests.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            Next: {nextDestinations}
          </div>
        )}

        {/* Idle time */}
        {!elevator.isMoving && elevator.requests.length === 0 && (
          <div className="text-xs text-gray-500 mt-1">Idle</div>
        )}

        {/* Total requests badge */}
        <Badge variant="outline" className="text-xs mt-1">
          {elevator.requests.length} requests
        </Badge>
      </div>
    </div>
  );
});

ElevatorInfo.displayName = "ElevatorInfo";

export function ElevatorSystem({
  elevators,
  numberOfFloors,
  pendingRequests,
}: ElevatorSystemProps) {
  const { addRequest } = useElevatorStore();
  const floorContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(470);

  // Memoize the handleRequest function to prevent unnecessary re-renders
  const handleRequest = useCallback(
    (originFloor: number, destinationFloor: number) => {
      addRequest(originFloor, destinationFloor);
    },
    [addRequest]
  );

  // Optimize resize handler with useCallback
  const updateHeight = useCallback(() => {
    if (floorContainerRef.current) {
      setContainerHeight(floorContainerRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => window.removeEventListener("resize", updateHeight);
  }, [updateHeight, numberOfFloors]);

  // Determine if we should use virtual scrolling (for large floor counts)
  const shouldUseVirtualScrolling = numberOfFloors > 50;
  const itemHeight = 42; // Height of each floor button (40px + 2px gap)

  // Memoize floor data to prevent recalculation on every render
  const floorData = useMemo(() => {
    if (shouldUseVirtualScrolling) return []; // Don't calculate all floors for virtual scrolling

    return Array.from({ length: numberOfFloors }, (_, i) => {
      const floor = numberOfFloors - i;
      const floorRequests = pendingRequests.filter(
        (req) => req.originFloor === floor || req.destinationFloor === floor
      );
      const upRequests = pendingRequests.filter(
        (req) => req.originFloor === floor
      );
      const downRequests = pendingRequests.filter(
        (req) => req.destinationFloor === floor
      );

      return {
        floor,
        floorRequests,
        upRequests,
        downRequests,
      };
    });
  }, [numberOfFloors, pendingRequests, shouldUseVirtualScrolling]);

  return (
    <div className="flex gap-4 flex-col">
      {/* Elevator Shafts */}
      <div className="flex gap-4 mt-4">
        <div ref={floorContainerRef} className="flex flex-col gap-2 w-32">
          {shouldUseVirtualScrolling ? (
            <VirtualFloorList
              numberOfFloors={numberOfFloors}
              pendingRequests={pendingRequests}
              onRequest={handleRequest}
              containerHeight={containerHeight}
              itemHeight={itemHeight}
            />
          ) : (
            floorData.map(({ floor, upRequests, downRequests }) => (
              <FloorButton
                key={floor}
                floor={floor}
                numberOfFloors={numberOfFloors}
                upRequests={upRequests}
                downRequests={downRequests}
                onRequest={handleRequest}
              />
            ))
          )}
        </div>
        <div className="flex gap-2">
          {elevators.map((elevator) => (
            <ElevatorShaft
              key={elevator.id}
              elevator={elevator}
              numberOfFloors={numberOfFloors}
              containerHeight={containerHeight}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 ml-36">
        {elevators.map((elevator) => (
          <ElevatorInfo key={elevator.id} elevator={elevator} />
        ))}
      </div>
    </div>
  );
}
