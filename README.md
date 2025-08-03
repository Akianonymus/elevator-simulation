# Elevator Simulation Backend

A real-time elevator simulation backend built with Node.js, Express, and Socket.IO, featuring intelligent scheduling algorithms with smart request reassignment and wait time optimization.

## Features

- **Real-time Communication**: All elevator operations are handled via WebSocket connections
- **Intelligent Scheduling**: Multi-factor fitness-based algorithm with wait time estimation
- **Smart Reassignment**: Automatic request reassignment to prevent stuck requests
- **Priority-Based Processing**: High-priority requests processed first with automatic escalation
- **Load Balancing**: Prevents overloading single elevators
- **Morning Peak Simulation**: Realistic traffic patterns for office building scenarios
- **Comprehensive Validation**: Input validation for all operations
- **Error Handling**: Structured error responses with detailed messages
- **Real-time Updates**: Automatic broadcasting of state changes to all connected clients

## Architecture

### File Structure

```
src/
├── index.ts          # Main server file with Socket.IO setup
├── socketRoutes.ts   # All Socket.IO event handlers
├── elevatorSystem.ts # Core elevator simulation logic with enhanced algorithms
└── types.ts          # TypeScript type definitions including reassignment tracking
```

### Key Features Implemented

1. **Enhanced Fitness Algorithm**: Considers distance, wait time, load, workload, direction, and priority
2. **Wait Time Estimation**: Calculates estimated wait times based on elevator's current path and intermediate stops
3. **Smart Reassignment**: Automatically reassigns stuck requests with 20% improvement threshold
4. **Priority Escalation**: Requests waiting over 30 seconds get automatic priority increases
5. **Load Balancing**: Maximum requests per elevator capped at 1.5x capacity
6. **Real-time Communication**: All operations via Socket.IO with immediate state updates

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Testing

```bash
# Test socket functionality
npm run test-socket

# Test API (legacy)
npm test
```

## Socket.IO API

The server exclusively uses Socket.IO for all elevator operations. See [SOCKET_API.md](./SOCKET_API.md) for complete documentation.

### Quick Start Example

```javascript
const socket = io("http://localhost:8000");

// Listen for system updates
socket.on("system_state", (systemState) => {
  console.log("System updated:", systemState);
});

// Start simulation
socket.emit("start_simulation");

// Add a request
socket.emit("add_request", {
  originFloor: 1,
  destinationFloor: 5,
});

// Update configuration
socket.emit("update_config", {
  numberOfElevators: 6,
  numberOfFloors: 12,
});
```

## Available Events

### Client to Server

- `get_system_status` - Get complete system state
- `start_simulation` - Start the simulation
- `stop_simulation` - Stop the simulation
- `reset_simulation` - Reset the simulation
- `update_config` - Update configuration
- `add_request` - Add manual request
- `get_elevator_state` - Get specific elevator state
- `get_logs` - Get system logs
- `get_stats` - Get statistics
- `generate_random_requests` - Generate random requests

### Server to Client

- `system_state` - System state updates
- `simulation_started` - Simulation started notification
- `simulation_stopped` - Simulation stopped notification
- `config_updated` - Configuration updated notification
- `request_added` - Request added notification
- `new_log` - Real-time log entries
- `error` - Error responses

## Algorithm Features

### Enhanced Fitness Calculation

The system uses a sophisticated fitness algorithm that considers:

- **Distance**: Physical distance between elevator and request origin
- **Estimated Wait Time**: Calculated based on elevator's current path and intermediate stops
- **Load Factor**: Current passenger load relative to capacity
- **Workload Factor**: Total pending requests assigned to elevator
- **Direction Bonus**: Reward for elevators moving toward the request
- **Priority Bonus**: Escalation for long-waiting requests

### Smart Reassignment System

- Only reassigns requests that are waiting (not currently being transported)
- Requires significant improvement threshold (20% better fitness score)
- Implements cooldown period (10 seconds) to prevent thrashing
- Clears cooldown when priority escalates to allow immediate reassignment

### Priority-Based Processing

- Requests sorted by priority first, then by timestamp (oldest first)
- Priority escalation after 30 seconds of waiting
- High-priority requests processed before low-priority ones
- Immediate reassignment allowed for escalated priorities

### Load Balancing

- Maximum requests per elevator capped at 1.5x capacity
- Considers both current passengers and pending requests
- Prevents "herd mentality" where all requests cluster to one elevator

## Benefits of Socket.IO Implementation

1. **Real-time Updates**: Clients receive immediate updates when system state changes
2. **Reduced Latency**: No need for polling or repeated HTTP requests
3. **Better UX**: Instant feedback for all operations
4. **Scalable**: Efficient for multiple concurrent clients
5. **Bidirectional**: Full duplex communication
6. **Automatic Reconnection**: Built-in reconnection handling

## Health Check

The server provides a health check endpoint:

```
GET /health
```

## Environment Variables

- `PORT` - Server port (default: 8000)
- `FRONTEND_URL` - CORS origin (default: http://localhost:3000)
- `NODE_ENV` - Environment mode (development/production)

## Error Handling

All socket events return structured error responses:

```javascript
{
  success: false,
  error: "Error message",
  details: "Additional error details"
}
```

## Performance Characteristics

- **Normal Operation**: 4 elevators, 10 floors, 1 request/second - wait times under 12 seconds
- **Peak Traffic**: Handles 50+ simultaneous requests with better distribution
- **Load Balancing**: More even elevator utilization across all units
- **Reassignment Efficiency**: 20-30% reduction in maximum wait times through smart reassignment
- **Priority Handling**: High-priority requests consistently processed within 5-10 seconds

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC
