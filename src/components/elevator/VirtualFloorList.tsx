"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { ElevatorRequest } from "@/lib/types";
import { FloorButton } from "./FloorButton";

interface VirtualFloorListProps {
  numberOfFloors: number;
  pendingRequests: ElevatorRequest[];
  onRequest: (originFloor: number, destinationFloor: number) => void;
  containerHeight: number;
  itemHeight: number;
}

const VISIBLE_ITEMS_BUFFER = 5; // Extra items to render above/below visible area

export function VirtualFloorList({
  numberOfFloors,
  pendingRequests,
  onRequest,
  containerHeight,
  itemHeight,
}: VirtualFloorListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - VISIBLE_ITEMS_BUFFER
    );
    const endIndex = Math.min(
      numberOfFloors - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) +
        VISIBLE_ITEMS_BUFFER
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, numberOfFloors]);

  // Memoize floor data for visible range only
  const visibleFloorData = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    const data = [];

    for (let i = startIndex; i <= endIndex; i++) {
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
        index: i,
      });
    }

    return data;
  }, [visibleRange, numberOfFloors, pendingRequests]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate total height and offset
  const totalHeight = numberOfFloors * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-2 w-32 overflow-y-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Spacer for items above visible range */}
      <div style={{ height: offsetY }} />

      {/* Visible floor buttons */}
      {visibleFloorData.map(({ floor, upRequests, downRequests }) => (
        <FloorButton
          key={floor}
          floor={floor}
          numberOfFloors={numberOfFloors}
          upRequests={upRequests}
          downRequests={downRequests}
          onRequest={onRequest}
        />
      ))}

      {/* Spacer for items below visible range */}
      <div
        style={{
          height: totalHeight - offsetY - visibleFloorData.length * itemHeight,
        }}
      />
    </div>
  );
}
