# Elevator System Simulation & Optimization

A web-based elevator simulation system with intelligent scheduling algorithms that efficiently handle passenger requests while prioritizing user experience. This frontend application provides real-time visualization and control of a multi-elevator system serving multiple floors.

## Features Implemented

### Real-time Building Visualization

- **Elevator Status Display**: Real-time positions, movement directions (↑/↓/idle), door states, and passenger counts
- **Floor Request Visualization**: Visual indicators for up/down button requests on each floor
- **Destination Requests**: Internal elevator destination requests display
- **Interactive Building Layout**: Responsive visualization of the entire building structure

### Interactive Simulation Controls

- **System Control**: Start, stop, and reset simulation with real-time status feedback
- **Configuration Management**: Adjust number of elevators, floors, elevator capacity, and request frequency
- **Speed Controls**: Real-time simulation speed adjustment
- **Request Generation**: Manual request addition and random request generation with configurable parameters
- **Stress Testing**: Generate high-volume requests to test system performance

### Advanced Request Handling

- **Manual Request Addition**: Add specific origin-to-destination floor requests
- **Random Request Generation**: Configurable batch request generation
- **Request Tracking**: Real-time monitoring of pending, active, and completed requests
- **Priority Management**: Built-in priority escalation for long-waiting requests

### Performance Monitoring

- **Live Statistics**: Average/maximum wait times, completion rates, elevator utilization
- **Real-time Metrics**: Total requests, completed requests, pending requests
- **Connection Status**: WebSocket connection monitoring with error handling
- **Performance Indicators**: Visual feedback on system performance

### Comprehensive Logging System

- **Event Logging**: Detailed logging of all system events with timestamps
- **Debounced Updates**: Optimized log updates to prevent UI performance issues
- **Event Categories**: System initialization, request handling, elevator movements, errors
- **Real-time Log Display**: Live log viewer with scrollable history

## Technology Stack

- **Framework**: Next.js 15.4.5 with TypeScript
- **UI Library**: React 19.1.0
- **State Management**: Zustand with shallow subscriptions
- **Real-time Communication**: Socket.io client
- **Styling**: Tailwind CSS with shadcn/ui components
- **Icons**: Lucide React
- **Build Tool**: Turbopack for development

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone the repository and navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Configure environment variables:
   Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

4. Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Connection

This frontend application connects to a backend simulation engine via WebSocket. Ensure the backend server is running on the configured URL (default: http://localhost:8000).

## Usage Guide

### Starting the Simulation

1. Configure the system parameters (number of elevators, floors, capacity)
2. Click "Start Simulation" to begin the elevator system
3. Monitor real-time statistics and elevator movements

### Adding Requests

- **Manual Requests**: Use the "Add Request" form to specify origin and destination floors
- **Stress Testing**: Use the stress test feature to generate high-volume requests

### Monitoring Performance

- View real-time statistics in the dashboard header
- Monitor elevator utilization and wait times
- Check the simulation logs for detailed event history
- Watch connection status for backend communication

## Architecture Overview

### State Management

The application uses Zustand for global state management with optimized subscriptions:

- `SystemState`: Complete simulation state including elevators, requests, and configuration
- `ConnectionStatus`: WebSocket connection state and error handling
- `Logs`: Real-time event logging with debounced updates

### Real-time Communication

- WebSocket connection to backend simulation engine
- Event-driven updates for system state, logs, and statistics
- Automatic reconnection and error handling
- Debounced log updates for performance optimization

### Component Structure

- **BuildingVisualization**: Main elevator system display
- **SimulationControls**: Interactive control panel
- **SimulationLogs**: Real-time event logging
- **ElevatorSystem**: Core elevator visualization logic
- **FloorButton**: Individual floor request buttons

### Custom Hooks

- `useElevatorSystem`: Main system hook with WebSocket management
- `useElevatorState`: Selective elevator state subscription
- `useSystemState`: Global system state access
- `useConnectionStatus`: Connection monitoring

## Environment Configuration

### Required Environment Variables

- `NEXT_PUBLIC_BACKEND_URL`: Backend WebSocket server URL (default: http://localhost:8000)

### Development vs Production

- Development uses Turbopack for faster builds
- Production builds are optimized with Next.js build system
- WebSocket connection automatically adapts to environment

## Performance Features

### Optimized Rendering

- Shallow state subscriptions to prevent unnecessary re-renders
- Debounced log updates to maintain UI responsiveness
- Efficient elevator state management with selective updates

### Real-time Performance

- WebSocket-based real-time updates
- Automatic connection recovery
- Error handling with user feedback
- Performance monitoring and statistics

### Scalability

- Configurable elevator and floor counts
- Stress testing capabilities
- Efficient state management for large systems
- Optimized component rendering
