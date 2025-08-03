"use client";

import { useElevatorStore } from "@/store/elevatorStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo, useCallback, memo } from "react";

// Memoized color mapping to avoid recalculations
const EVENT_COLORS = {
  system_initialized:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  simulation_started:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  simulation_stopped:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  simulation_reset:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  config_updated:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  request_generated:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  manual_request_added:
    "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  request_assigned:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  request_completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  request_reassigned:
    "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  priority_escalated:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  repositioning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  elevator_moved:
    "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  load_updated: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
  idle_elevator_pickup:
    "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  elevator_full:
    "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  error_occurred: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  warning_issued:
    "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
} as const;

// Memoized LogEntry component to prevent unnecessary re-renders
const LogEntry = memo(({ log, index }: { log: any; index: number }) => {
  const eventColor = EVENT_COLORS[log.event as keyof typeof EVENT_COLORS];
  const hasDetails = Object.keys(log.details).length > 0;

  return (
    <div className="flex items-start justify-between place-items-center gap-2 p-2 border rounded">
      <Badge className={`${eventColor} text-sm`}>
        {log.event.replace(/_/g, " ")}
      </Badge>
      <div className="flex gap-4 items-center place-items-center">
        <div className="text-xs">
          <span className="font-medium">{log.message}</span>
        </div>
        {hasDetails && (
          <details className="mt-1">
            <summary className="text-xs text-muted-foreground cursor-pointer">
              Details
            </summary>
            <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded mt-1 overflow-x-auto">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </details>
        )}
      </div>
      <span className="text-muted-foreground ml-2">
        {format(new Date(log.timestamp), "HH:mm:ss")}
      </span>
    </div>
  );
});

LogEntry.displayName = "LogEntry";

// Memoized filter controls component
const FilterControls = memo(
  ({
    eventTypeFilter,
    setEventTypeFilter,
    elevatorFilter,
    setElevatorFilter,
    eventTypes,
    elevatorIds,
    hasActiveFilters,
    clearFilters,
    showAllLogs,
    setShowAllLogs,
    totalLogs,
    displayedLogs,
  }: {
    eventTypeFilter: string;
    setEventTypeFilter: (value: string) => void;
    elevatorFilter: string;
    setElevatorFilter: (value: string) => void;
    eventTypes: string[];
    elevatorIds: (number | undefined)[];
    hasActiveFilters: boolean;
    clearFilters: () => void;
    showAllLogs: boolean;
    setShowAllLogs: (value: boolean) => void;
    totalLogs: number;
    displayedLogs: number;
  }) => {
    return (
      <div className="flex gap-2 items-center">
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {eventTypes.map((eventType) => (
              <SelectItem key={eventType} value={eventType}>
                {eventType.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={elevatorFilter} onValueChange={setElevatorFilter}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Elevator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All elevators</SelectItem>
            {elevatorIds.map((id) => (
              <SelectItem key={id} value={id?.toString() || ""}>
                Elevator {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">
            Showing {displayedLogs} of {totalLogs} logs
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllLogs(!showAllLogs)}
            className="h-8"
          >
            {showAllLogs ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Show Recent
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Show All
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }
);

FilterControls.displayName = "FilterControls";

export function SimulationLogs() {
  // Use shallow comparison to prevent unnecessary re-renders
  const logs = useElevatorStore((state) => state.logs);

  // Filter states
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [elevatorFilter, setElevatorFilter] = useState<string>("all");
  const [showAllLogs, setShowAllLogs] = useState<boolean>(false);

  // Memoized filter options with stable references
  const { eventTypes, elevatorIds } = useMemo(() => {
    const types = [...new Set(logs.map((log) => log.event))].sort();
    const ids = [
      ...new Set(
        logs.map((log) => log.elevatorId).filter((id) => id !== undefined)
      ),
    ].sort((a, b) => (a || 0) - (b || 0));
    return { eventTypes: types, elevatorIds: ids };
  }, [logs]);

  // Optimized filtering with early returns and reduced iterations
  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Apply filters
    if (eventTypeFilter !== "all" || elevatorFilter !== "all") {
      const elevatorIdFilter =
        elevatorFilter !== "all" ? parseInt(elevatorFilter) : null;

      filtered = logs.filter((log) => {
        if (eventTypeFilter !== "all" && log.event !== eventTypeFilter) {
          return false;
        }
        if (elevatorIdFilter !== null && log.elevatorId !== elevatorIdFilter) {
          return false;
        }
        return true;
      });
    }

    // Reverse to show newest first
    filtered = filtered.slice().reverse();

    // Apply log limit based on showAllLogs state
    if (!showAllLogs) {
      filtered = filtered.slice(0, 100);
    }

    return filtered;
  }, [logs, eventTypeFilter, elevatorFilter, showAllLogs]);

  // Memoized callback for clearing filters
  const clearFilters = useCallback(() => {
    setEventTypeFilter("all");
    setElevatorFilter("all");
  }, []);

  const hasActiveFilters =
    eventTypeFilter !== "all" || elevatorFilter !== "all";

  return (
    <div className="space-y-3">
      <FilterControls
        eventTypeFilter={eventTypeFilter}
        setEventTypeFilter={setEventTypeFilter}
        elevatorFilter={elevatorFilter}
        setElevatorFilter={setElevatorFilter}
        eventTypes={eventTypes}
        elevatorIds={elevatorIds}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
        showAllLogs={showAllLogs}
        setShowAllLogs={setShowAllLogs}
        totalLogs={logs.length}
        displayedLogs={filteredLogs.length}
      />

      {filteredLogs.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 text-sm">
          {logs.length === 0
            ? "No logs yet. Start the simulation or make a manual request from floor controls to see activity."
            : "No logs match the current filters. Try adjusting your filter criteria."}
        </div>
      ) : (
        <ScrollArea className="h-[70vh]">
          <div className="flex flex-col space-y-2 p-1">
            {filteredLogs.map((log, index) => (
              <LogEntry
                key={`${log.timestamp}-${log.event}-${
                  log.elevatorId || "system"
                }-${index}`}
                log={log}
                index={index}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
