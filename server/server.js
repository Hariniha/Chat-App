// =============================================================================
// MINIMAL WHATSAPP-STYLE WEBSOCKET SERVER
// =============================================================================
// This server handles real-time bidirectional messaging between multiple clients

// STEP 1: Import the WebSocket library
// 'ws' is a popular, lightweight WebSocket implementation for Node.js
const WebSocket = require('ws');

// STEP 2: Create a WebSocket server on port 8080
// This creates a server that listens for WebSocket connections
// Think of it as opening a phone line that clients can call into
const server = new WebSocket.Server({ port: 8080 });

// STEP 3: Keep track of all connected clients
// We store all active connections so we can broadcast messages to everyone
// Like a group chat - we need to know who's in the room
const clients = new Set();

console.log('🚀 WebSocket server started on ws://localhost:8080');

// =============================================================================
// STEP 4: Handle new client connections
// =============================================================================
// This event fires whenever a new client connects to the server
// 'ws' represents the WebSocket connection to that specific client
server.on('connection', (ws) => {
  
  console.log('✅ New client connected! Total clients:', clients.size + 1);
  
  // Add this new client to our set of active connections
  clients.add(ws);
  
  // Send a welcome message to the newly connected client
  // This shows them that the connection is established
  ws.send(JSON.stringify({
    type: 'system',
    message: 'Connected to chat server!',
    timestamp: new Date().toISOString()
  }));

  // =========================================================================
  // STEP 5: Handle incoming messages from this client
  // =========================================================================
  // This event fires whenever THIS specific client sends a message
  ws.on('message', (data) => {
    
    console.log('📨 Received message:', data.toString());
    
    try {
      // Parse the incoming JSON message
      // Clients send messages as JSON strings, so we convert back to objects
      const messageData = JSON.parse(data);
      
      // Add server-side timestamp to ensure accuracy
      // The client's clock might be wrong, so we add our own timestamp
      messageData.timestamp = new Date().toISOString();
      
      // =====================================================================
      // STEP 6: Broadcast the message to ALL connected clients
      // =====================================================================
      // This is the key to real-time chat!
      // We loop through all connected clients and send them the message
      clients.forEach((client) => {
        
        // Check if the client connection is still open and ready
        // OPEN = 1 (WebSocket.OPEN constant)
        if (client.readyState === WebSocket.OPEN) {
          
          // Send the message as a JSON string
          // We stringify the object so it can travel over the network
          client.send(JSON.stringify(messageData));
          
          // Note: This sends to EVERYONE, including the sender
          // WhatsApp would filter this out, but for simplicity we'll handle it on the frontend
        }
      });
      
    } catch (error) {
      // Handle any errors in message processing
      console.error('❌ Error processing message:', error);
    }
  });

  // =========================================================================
  // STEP 7: Handle client disconnection
  // =========================================================================
  // This fires when a client closes their connection
  // Could be from closing the browser, losing internet, or intentional disconnect
  ws.on('close', () => {
    
    console.log('👋 Client disconnected. Total clients:', clients.size - 1);
    
    // Remove this client from our active connections set
    // Important! Otherwise we'd try to send messages to a dead connection
    clients.delete(ws);
  });

  // =========================================================================
  // STEP 8: Handle connection errors
  // =========================================================================
  // Network issues, protocol violations, etc.
  ws.on('error', (error) => {
    
    console.error('⚠️ WebSocket error:', error.message);
    
    // Clean up this connection
    clients.delete(ws);
  });
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
// Handle server shutdown gracefully (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  
  // Close all client connections
  clients.forEach((client) => {
    client.close();
  });
  
  // Close the server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// =============================================================================
// HOW THIS WORKS - THE FLOW:
// =============================================================================
/*
1. SERVER STARTS
   - Creates WebSocket server listening on port 8080
   - Waits for clients to connect

2. CLIENT CONNECTS
   - Client opens WebSocket connection: new WebSocket('ws://localhost:8080')
   - Server accepts connection and adds client to the 'clients' Set
   - Server sends welcome message to that client

3. CLIENT SENDS MESSAGE
   - Client calls: ws.send(JSON.stringify({ user: 'Alice', message: 'Hello!' }))
   - Message travels over the WebSocket connection to server
   - Server receives message in 'message' event handler

4. SERVER BROADCASTS
   - Server parses the JSON message
   - Server loops through ALL connected clients
   - Server sends the message to each client that's still connected
   - This happens in REAL-TIME (milliseconds)

5. CLIENTS RECEIVE
   - Each client's 'message' event handler fires
   - Client parses the JSON and updates their UI
   - New message appears instantly in chat!

6. CLIENT DISCONNECTS
   - Client closes browser/tab or calls ws.close()
   - Server's 'close' event handler fires
   - Server removes client from the Set
   - No more messages sent to that client

KEY CONCEPTS:
- PERSISTENT CONNECTION: Unlike HTTP, the connection stays open
- BIDIRECTIONAL: Both client and server can send anytime
- EVENT-DRIVEN: Everything is based on events (connection, message, close, error)
- BROADCAST PATTERN: Server forwards messages to all clients (group chat behavior)
- JSON MESSAGING: We use JSON for structured data exchange
*/
