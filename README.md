# Elevator Simulation Backend

A real-time elevator simulation backend built with Node.js, Express, and Socket.IO.

## Features

- **Real-time Communication**: All elevator operations are handled via WebSocket connections
- **Complete API Coverage**: All REST API endpoints have been converted to Socket.IO events
- **Validation**: Comprehensive input validation for all operations
- **Error Handling**: Structured error responses with detailed messages
- **Real-time Updates**: Automatic broadcasting of state changes to all connected clients

## Architecture

### File Structure

```
src/
├── index.ts          # Main server file
├── socketRoutes.ts   # All Socket.IO event handlers
├── elevatorSystem.ts # Core elevator simulation logic
└── types.ts          # TypeScript type definitions
```

### Key Changes Made

1. **Removed REST API**: All `/api/*` endpoints have been removed
2. **Organized Socket Events**: All socket handlers are now in `socketRoutes.ts`
3. **Enhanced Validation**: Added comprehensive validation similar to the original REST API
4. **Structured Responses**: All responses now include success/error flags and consistent formatting
5. **Real-time Broadcasting**: State changes are automatically broadcasted to all clients

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

The server now exclusively uses Socket.IO for all elevator operations. See [SOCKET_API.md](./SOCKET_API.md) for complete documentation.

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
- `error` - Error responses

## Benefits of Socket.IO Implementation

1. **Real-time Updates**: Clients receive immediate updates when system state changes
2. **Reduced Latency**: No need for polling or repeated HTTP requests
3. **Better UX**: Instant feedback for all operations
4. **Scalable**: Efficient for multiple concurrent clients
5. **Bidirectional**: Full duplex communication
6. **Automatic Reconnection**: Built-in reconnection handling

## Migration from REST API

If you were previously using the REST API, here's how to migrate:

| REST Endpoint           | Socket Event         |
| ----------------------- | -------------------- |
| `GET /api/status`       | `get_system_status`  |
| `POST /api/start`       | `start_simulation`   |
| `POST /api/stop`        | `stop_simulation`    |
| `POST /api/reset`       | `reset_simulation`   |
| `PUT /api/config`       | `update_config`      |
| `POST /api/request`     | `add_request`        |
| `GET /api/elevator/:id` | `get_elevator_state` |
| `GET /api/logs`         | `get_logs`           |
| `GET /api/stats`        | `get_stats`          |

## Health Check

The server still provides a health check endpoint:

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC
