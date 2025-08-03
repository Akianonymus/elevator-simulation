"use client";

import {
  useElevatorSystem,
  useSystemState,
  useConnectionStatus,
} from "@/hooks/useElevatorSystem";
import { BuildingVisualization } from "@/components/elevator/BuildingVisualization";
import { SimulationControls } from "@/components/simulation/SimulationControls";
import { SimulationLogs } from "@/components/simulation/SimulationLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Home() {
  const actions = useElevatorSystem();
  const systemState = useSystemState();
  const { isConnected, error } = useConnectionStatus();

  const avgWaitTimeSeconds =
    (systemState && systemState?.stats.maxWaitTime / 1000) || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between place-items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-blue-600 w-max">
                Elevator Simulation Dashboard
              </h1>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center gap-4">
              <Badge
                variant={isConnected ? "default" : "destructive"}
                className="flex items-center gap-2"
              >
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto px-4 py-4">
        {/* Error Alert */}

        {/* Top Section - Simulation Controls */}
        <div className="mb-4">
          <SimulationControls actions={actions} systemState={systemState} />
        </div>

        {/* Middle Section - Building Visualization and Logs */}
        <div className="flex gap-2 mb-4 *:w-1/2">
          <Card>
            <CardHeader className="pb-3 flex justify-between">
              <div>
                <CardTitle className="text-lg">
                  Building Visualization
                </CardTitle>
                {systemState && (
                  <p className="text-sm text-muted-foreground">
                    {systemState.config.numberOfElevators} Elevators •{" "}
                    {systemState.config.numberOfFloors} Floors
                  </p>
                )}
              </div>
              <div>
                <div>
                  Total Requests: {systemState?.stats.totalRequests || 0}
                </div>
                <div>
                  Completed: {systemState?.stats.completedRequests || 0}
                </div>
              </div>
              <div>Max Wait Time: {avgWaitTimeSeconds}s</div>
            </CardHeader>
            <CardContent className="h-full">
              {systemState ? (
                <BuildingVisualization systemState={systemState} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading building state...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right - Simulation Logs */}
          <Card className="gap-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg pb-0">Simulation Logs</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <SimulationLogs />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
