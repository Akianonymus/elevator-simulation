"use client";

import { SystemState, SimulationConfig } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Users,
  Building,
  Users2,
  Clock,
  Loader2,
  Activity,
  ArrowUpDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SimulationControlsProps {
  actions: any;
  systemState: SystemState | null;
}

export function SimulationControls({
  actions,
  systemState,
}: SimulationControlsProps) {
  const config = systemState?.config;
  const [simulationTime, setSimulationTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [numRequests, setNumRequests] = useState(10);
  const [fromFloor, setFromFloor] = useState(1);
  const [toFloor, setToFloor] = useState(6);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (systemState?.isRunning) {
      interval = setInterval(() => {
        setSimulationTime((prev) => prev + 1);
      }, 1000);
    } else {
      setSimulationTime(0);
    }
    return () => clearInterval(interval);
  }, [systemState?.isRunning]);

  const handleConfigChange = (
    key: keyof SimulationConfig,
    value: number | boolean
  ) => {
    if (config) {
      actions.updateConfig({ ...config, [key]: value });
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await actions.startSimulation();
    } catch (error) {
      console.error("Failed to start simulation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await actions.stopSimulation();
    } catch (error) {
      console.error("Failed to stop simulation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await actions.resetSimulation();
    } catch (error) {
      console.error("Failed to reset simulation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStressTest = async () => {
    try {
      actions.generateRandomRequests(numRequests);
    } catch (error) {
      console.error("Failed to generate random requests:", error);
    }
  };

  const handleAddRequest = async () => {
    if (fromFloor === toFloor) {
      console.error("From floor and to floor cannot be the same");
      return;
    }

    try {
      actions.addRequest(fromFloor, toFloor);
    } catch (error) {
      console.error("Failed to add request:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardContent className="space-y-2">
        {/* Top Row - Title and Controls */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3 mx-auto">
            <Button
              onClick={handleStart}
              disabled={systemState?.isRunning || isLoading}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Start
            </Button>
            <Button
              onClick={handleStop}
              disabled={!systemState?.isRunning || isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Pause className="h-4 w-4 mr-1" />
              )}
              Stop
            </Button>
            <Button
              onClick={handleReset}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reset
            </Button>
            <Badge variant="outline" className="text-xs">
              {formatTime(simulationTime)}
            </Badge>
            <Badge
              variant={systemState?.isRunning ? "default" : "secondary"}
              className="text-xs"
            >
              {systemState?.isRunning ? "Running" : "Stopped"}
            </Badge>
          </div>
        </div>

        {/* Configuration Sliders */}
        {config && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            <div>
              <Label className="flex items-center gap-1 text-xs">
                <Zap className="h-3 w-3" />
                Speed: {config.simulationSpeed}x
              </Label>
              <Slider
                value={[config.simulationSpeed]}
                onValueChange={([value]) =>
                  handleConfigChange("simulationSpeed", value)
                }
                min={1}
                max={10}
                step={1}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3" />
                Elevators: {config.numberOfElevators}
              </Label>
              <Slider
                value={[config.numberOfElevators]}
                onValueChange={([value]) =>
                  handleConfigChange("numberOfElevators", value)
                }
                min={1}
                max={6}
                step={1}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1 text-xs">
                <Building className="h-3 w-3" />
                Floors: {config.numberOfFloors}
              </Label>
              <Slider
                value={[config.numberOfFloors]}
                onValueChange={([value]) =>
                  handleConfigChange("numberOfFloors", value)
                }
                min={5}
                max={10}
                step={1}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1 text-xs">
                <Users2 className="h-3 w-3" />
                Capacity: {config.elevatorCapacity}
              </Label>
              <Slider
                value={[config.elevatorCapacity]}
                onValueChange={([value]) =>
                  handleConfigChange("elevatorCapacity", value)
                }
                min={4}
                max={16}
                step={1}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                Rate: {config.requestFrequency} per min
              </Label>
              <Slider
                value={[config.requestFrequency]}
                onValueChange={([value]) =>
                  handleConfigChange("requestFrequency", value)
                }
                min={1}
                max={100}
                step={1}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Stress Test Section */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="num-requests" className="text-sm">
              No of requests:
            </Label>
            <Input
              id="num-requests"
              type="number"
              min="1"
              max="1000"
              value={numRequests}
              onChange={(e) => setNumRequests(parseInt(e.target.value) || 1)}
              className="w-20 h-8 text-sm"
            />
            <Button
              onClick={handleStressTest}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Activity className="h-4 w-4 mr-1" />
              Stress Test
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="from-floor" className="text-sm">
                From Floor:
              </Label>
              <Input
                id="from-floor"
                type="number"
                min="1"
                max={config?.numberOfFloors || 10}
                value={fromFloor}
                onChange={(e) => setFromFloor(parseInt(e.target.value) || 1)}
                className="w-20 h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="to-floor" className="text-sm">
                To Floor:
              </Label>
              <Input
                id="to-floor"
                type="number"
                min="1"
                max={config?.numberOfFloors || 10}
                value={toFloor}
                onChange={(e) => setToFloor(parseInt(e.target.value) || 2)}
                className="w-20 h-8 text-sm"
              />
            </div>
            <Button
              onClick={handleAddRequest}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={fromFloor === toFloor}
            >
              Add Request
            </Button>
          </div>

          {/* Rush Hour Toggle */}
          {config && (
            <div className="flex items-center space-x-2">
              <Switch
                id="rush-hour"
                checked={config.morningPeakBias}
                onCheckedChange={(checked) =>
                  handleConfigChange("morningPeakBias", checked)
                }
              />
              <Label
                htmlFor="rush-hour"
                className="text-sm flex items-center gap-1"
              >
                <Zap className="h-3 w-3" />
                Morning Rush Hour
              </Label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
