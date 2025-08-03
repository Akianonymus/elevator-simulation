"use client";

import { useMemo } from "react";
import { ElevatorRequest } from "@/lib/types";
import { FloorButton } from "./FloorButton";

interface VirtualFloorListProps {
  numberOfFloors: number;
  pendingRequests: ElevatorRequest[];
  onRequest: (originFloor: number, destinationFloor: number) => void;
  containerHeight: number;
  itemHeight: number;
}

export function VirtualFloorList({
  numberOfFloors,
  pendingRequests,
  onRequest,
  containerHeight,
  itemHeight,
}: VirtualFloorListProps) {
  // Generate all floor data
  const floorData = useMemo(() => {
    const data = [];

    for (let i = 0; i < numberOfFloors; i++) {
      const floor = numberOfFloors - i;
      const upRequests = pendingRequests.filter(
        (req) => req.originFloor === floor
      );
      const downRequests = pendingRequests.filter(
        (req) => req.destinationFloor === floor
      );

      data.push({
        floor,
        upRequests,
        downRequests,
      });
    }

    return data;
  }, [numberOfFloors, pendingRequests]);

  return (
    <div
      className="flex flex-col gap-2 w-32 overflow-y-auto"
      style={{ height: containerHeight }}
    >
      {/* All floor buttons */}
      {floorData.map(({ floor, upRequests, downRequests }) => (
        <FloorButton
          key={floor}
          floor={floor}
          numberOfFloors={numberOfFloors}
          upRequests={upRequests}
          downRequests={downRequests}
          onRequest={onRequest}
        />
      ))}
    </div>
  );
}
