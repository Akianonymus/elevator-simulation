"use client";

import { ElevatorRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { memo, useCallback } from "react";

interface FloorButtonProps {
  floor: number;
  numberOfFloors: number;
  upRequests: ElevatorRequest[];
  downRequests: ElevatorRequest[];
  onRequest: (originFloor: number, destinationFloor: number) => void;
}

export const FloorButton = memo(
  ({
    floor,
    numberOfFloors,
    upRequests,
    downRequests,
    onRequest,
  }: FloorButtonProps) => {
    const handleUpRequest = useCallback(() => {
      onRequest(floor, Math.min(floor + 1, numberOfFloors));
    }, [floor, numberOfFloors, onRequest]);

    const handleDownRequest = useCallback(() => {
      onRequest(floor, Math.max(floor - 1, 1));
    }, [floor, onRequest]);

    return (
      <div className="flex h-10 items-center gap-2 p-2 border rounded">
        <div className="w-6 text-center font-bold text-sm">{floor}</div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={upRequests.length > 0 ? "default" : "outline"}
            onClick={handleUpRequest}
            className="h-6 w-6 p-0 text-xs relative"
          >
            <ArrowUp className="h-3 w-3" />
            {upRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {upRequests.length}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant={downRequests.length > 0 ? "default" : "outline"}
            onClick={handleDownRequest}
            className="h-6 w-6 p-0 text-xs relative"
          >
            <ArrowDown className="h-3 w-3" />
            {downRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {downRequests.length}
              </span>
            )}
          </Button>
        </div>
        {upRequests.length + downRequests.length > 0 && (
          <div className="ml-1 text-xs text-muted-foreground">
            {upRequests.length + downRequests.length}
          </div>
        )}
      </div>
    );
  }
);

FloorButton.displayName = "FloorButton";
