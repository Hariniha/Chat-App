// =============================================================================
// WHATSAPP-STYLE CHAT APPLICATION - REACT FRONTEND
// =============================================================================
// This component handles the UI and WebSocket client connection

import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  
  // Store all chat messages - each message has: { user, message, timestamp, isMine }
  const [messages, setMessages] = useState([])
  
  // Store the current text input value
  const [inputMessage, setInputMessage] = useState('')
  
  // Store the user's name (load from localStorage if exists)
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('chatUsername') || ''
  })
  
  // Track if user has joined the chat (load from localStorage if exists)
  const [hasJoined, setHasJoined] = useState(() => {
    return localStorage.getItem('chatHasJoined') === 'true'
  })
  
  // Track WebSocket connection status: 'disconnected', 'connecting', 'connected'
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  
  // =========================================================================
  // REFS - Values that persist across re-renders but don't trigger re-renders
  // =========================================================================
  
  // Store the WebSocket connection object
  // We use useRef because we don't want to trigger re-renders when it changes
  const ws = useRef(null)
  
  // Reference to the messages container for auto-scrolling
  const messagesEndRef = useRef(null)

  // =========================================================================
  // STEP 1: ESTABLISH WEBSOCKET CONNECTION
  // =========================================================================
  // This useEffect runs once when the component mounts
  // It creates the WebSocket connection and sets up event handlers
  useEffect(() => {
    // Only connect if user has joined (entered their name)
    if (!hasJoined) return

    console.log('🔌 Attempting to connect to WebSocket server...')
    setConnectionStatus('connecting')

    // Create a new WebSocket connection to our server
    // ws:// is the WebSocket protocol (like http:// but for WebSockets)
    ws.current = new WebSocket('ws://localhost:8080')

    // ---------------------------------------------------------------------
    // EVENT HANDLER: Connection Opened
    // ---------------------------------------------------------------------
    // This fires when the WebSocket connection is successfully established
    ws.current.onopen = () => {
      console.log('✅ Connected to WebSocket server!')
      setConnectionStatus('connected')
    }

    // ---------------------------------------------------------------------
    // EVENT HANDLER: Message Received
    // ---------------------------------------------------------------------
    // This fires whenever the server sends us a message
    // This is how we receive messages in REAL-TIME!
    ws.current.onmessage = (event) => {
      console.log('📩 Received message from server:', event.data)

      try {
        // Parse the JSON string back into an object
        const messageData = JSON.parse(event.data)
        console.log('📦 Parsed message data:', messageData)

        // Check if this is a system message (like "Connected to chat server!")
        if (messageData.type === 'system') {
          // Add system message to chat
          setMessages(prev => [...prev, {
            user: 'System',
            message: messageData.message,
            timestamp: messageData.timestamp,
            isMine: false,
            isSystem: true
          }])
        } else if (messageData.type === 'register') {
          // Ignore register messages - these are internal
          console.log('👤 User registered:', messageData.username)
        } else if (messageData.user && messageData.message) {
          // Regular user message
          // Determine if this message is from us (to show on right side)
          const isMine = messageData.user === username

          // Add the new message to our messages array
          // We use functional update to ensure we have the latest state
          setMessages(prev => {
            const newMessages = [...prev, {
              ...messageData,
              isMine // Mark if it's our message for styling
            }]
            console.log('💬 Updated messages:', newMessages)
            return newMessages
          })
        } else {
          console.warn('⚠️ Unknown message format:', messageData)
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error)
      }
    }

    // ---------------------------------------------------------------------
    // EVENT HANDLER: Connection Closed
    // ---------------------------------------------------------------------
    // This fires when the WebSocket connection is closed
    // Could be from server shutdown, network issues, or intentional disconnect
    ws.current.onclose = () => {
      console.log('🔌 Disconnected from WebSocket server')
      setConnectionStatus('disconnected')
    }

    // ---------------------------------------------------------------------
    // EVENT HANDLER: Connection Error
    // ---------------------------------------------------------------------
    // This fires when there's an error with the WebSocket connection
    ws.current.onerror = (error) => {
      console.error('⚠️ WebSocket error:', error)
      setConnectionStatus('disconnected')
    }

    // ---------------------------------------------------------------------
    // CLEANUP FUNCTION
    // ---------------------------------------------------------------------
    // This runs when the component unmounts (user closes browser/tab)
    // We close the WebSocket connection gracefully
    return () => {
      if (ws.current) {
        console.log('🛑 Closing WebSocket connection...')
        ws.current.close()
      }
    }
  }, [hasJoined, username]) // Re-run if hasJoined or username changes

  // =========================================================================
  // STEP 2: AUTO-SCROLL TO LATEST MESSAGE
  // =========================================================================
  // Whenever new messages arrive, scroll to the bottom (like WhatsApp)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // =========================================================================
  // STEP 3: SEND MESSAGE FUNCTION
  // =========================================================================
  // This function is called when the user clicks Send or presses Enter
  const sendMessage = () => {
    // Don't send empty messages
    if (!inputMessage.trim()) return

    // Don't send if we're not connected
    if (ws.current?.readyState !== WebSocket.OPEN) {
      alert('Not connected to server!')
      return
    }

    // Create the message object
    const messageData = {
      type: 'message',
      user: username,
      message: inputMessage.trim(),
      timestamp: new Date().toISOString()
    }

    console.log('📤 Sending message:', messageData)

    // Send the message through the WebSocket
    // We convert the object to a JSON string
    ws.current.send(JSON.stringify(messageData))

    // Clear the input field
    setInputMessage('')
  }

  // =========================================================================
  // STEP 4: JOIN CHAT FUNCTION
  // =========================================================================
  // Called when user enters their name and clicks Join
  const joinChat = () => {
    if (username.trim()) {
      // Save to localStorage so it persists across page refreshes
      localStorage.setItem('chatUsername', username.trim())
      localStorage.setItem('chatHasJoined', 'true')
      setHasJoined(true)
    }
  }

  // =========================================================================
  // LOGOUT FUNCTION
  // =========================================================================
  // Allow user to logout and change their name
  const logout = () => {
    localStorage.removeItem('chatUsername')
    localStorage.removeItem('chatHasJoined')
    setHasJoined(false)
    setUsername('')
    setMessages([])
    if (ws.current) {
      ws.current.close()
    }
  }

  // =========================================================================
  // STEP 5: FORMAT TIMESTAMP
  // =========================================================================
  // Convert ISO timestamp to readable time (like WhatsApp)
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // =========================================================================
  // UI RENDERING
  // =========================================================================

  // Show join screen if user hasn't joined yet
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-green-500 w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">WhatsApp Clone</h1>
            <p className="text-gray-600">Enter your name to start chatting</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && joinChat()}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
              maxLength={20}
            />
            <button
              onClick={joinChat}
              disabled={!username.trim()}
              className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Join Chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main chat interface
  return (
    <div className="min-h-screen bg-gray-100">
      {/* ===================================================================
          HEADER - Like WhatsApp's top bar
          =================================================================== */}
      <div className="bg-green-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-lg">
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-lg">Chat Room</h2>
              <p className="text-xs text-green-100">
                {connectionStatus === 'connected' && '🟢 Connected'}
                {connectionStatus === 'connecting' && '🟡 Connecting...'}
                {connectionStatus === 'disconnected' && '🔴 Disconnected'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-green-100">
              {username}
            </span>
            <button
              onClick={logout}
              className="text-xs bg-green-700 hover:bg-green-800 px-3 py-1 rounded transition-colors"
              title="Logout and change name"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================
          MESSAGES AREA - The scrollable chat messages
          =================================================================== */}
      <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] overflow-y-auto message-list p-4 bg-[#e5ddd5]">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-3 flex message-enter ${
              msg.isSystem ? 'justify-center' : msg.isMine ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* SYSTEM MESSAGE - Centered, gray */}
            {msg.isSystem ? (
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm max-w-sm">
                <p className="text-sm text-gray-600 text-center">{msg.message}</p>
              </div>
            ) : (
              /* USER MESSAGE - Left (received) or Right (sent) */
              <div
                className={`max-w-sm px-4 py-2 rounded-lg shadow-md ${
                  msg.isMine
                    ? 'bg-green-500 text-white rounded-br-none' // My messages: green, no bottom-right corner
                    : 'bg-white text-gray-800 rounded-bl-none' // Their messages: white, no bottom-left corner
                }`}
              >
                {/* Show username only for received messages */}
                {!msg.isMine && (
                  <p className="text-xs font-semibold text-green-600 mb-1">
                    {msg.user}
                  </p>
                )}
                <p className="text-sm break-words">{msg.message}</p>
                <p
                  className={`text-xs mt-1 text-right ${
                    msg.isMine ? 'text-green-100' : 'text-gray-500'
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            )}
          </div>
        ))}
        
        {/* Invisible div for auto-scrolling to bottom */}
        <div ref={messagesEndRef} />
      </div>

      {/* ===================================================================
          INPUT AREA - Message input and send button
          =================================================================== */}
      <div className="bg-gray-200 border-t border-gray-300">
        <div className="max-w-4xl mx-auto p-3 flex items-center space-x-3">
          <input
            type="text"
            placeholder="Type a message"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 px-4 py-3 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={connectionStatus !== 'connected'}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || connectionStatus !== 'connected'}
            className="bg-green-500 text-white p-3 rounded-full hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App

// =============================================================================
// HOW REAL-TIME MESSAGING WORKS - THE COMPLETE FLOW:
// =============================================================================
/*
1. USER JOINS CHAT
   - User enters their name and clicks "Join Chat"
   - hasJoined becomes true, triggering the useEffect
   - WebSocket connection is created: new WebSocket('ws://localhost:8080')

2. CONNECTION ESTABLISHED
   - Browser sends WebSocket handshake request to server
   - Server accepts and connection is opened
   - onopen handler fires → connectionStatus becomes 'connected'
   - Server sends welcome message → onmessage handler receives it

3. USER TYPES AND SENDS MESSAGE
   - User types in input field → inputMessage state updates
   - User clicks Send or presses Enter → sendMessage() is called
   - Message data is created with username, message, timestamp
   - ws.current.send() sends JSON string through WebSocket to server

4. SERVER RECEIVES AND BROADCASTS
   - Server receives message from this client
   - Server adds server-side timestamp
   - Server loops through ALL connected clients
   - Server sends message to everyone (including sender)

5. ALL CLIENTS RECEIVE MESSAGE
   - Each client's onmessage handler fires
   - Message is parsed from JSON string to object
   - Check if message is from me (isMine = messageData.user === username)
   - Message is added to messages array → React re-renders
   - useEffect triggers auto-scroll to bottom

6. UI UPDATES IN REAL-TIME
   - React renders new message bubble
   - If isMine=true → green bubble on right (sent message)
   - If isMine=false → white bubble on left (received message)
   - Timestamp is formatted and displayed
   - Smooth scroll animation to show new message

KEY CONCEPTS EXPLAINED:

📡 WEBSOCKET LIFECYCLE:
   CONNECTING → OPEN → MESSAGE ⟷ MESSAGE → CLOSE
   
🔄 REAL-TIME UPDATE:
   Type → Send → WebSocket → Server → Broadcast → All Clients → UI Update
   (This happens in MILLISECONDS)

💭 STATE MANAGEMENT:
   - messages: Array of all chat messages
   - inputMessage: Current text input value
   - connectionStatus: Is WebSocket connected?
   - hasJoined: Has user entered their name?

🎨 WHATSAPP-STYLE UI:
   - Left bubbles (white) = Received messages
   - Right bubbles (green) = Sent messages  
   - Rounded corners with one corner sharp (message tail)
   - Timestamps in small text
   - Auto-scroll to latest message
   - Connection status indicator

🔧 REFS vs STATE:
   - ws.current: WebSocket object (doesn't need re-render)
   - messagesEndRef: DOM element for scrolling (doesn't need re-render)
   - State (messages, inputMessage): Causes re-renders when changed

🧹 CLEANUP:
   - When component unmounts, useEffect cleanup runs
   - WebSocket connection is closed gracefully
   - Prevents memory leaks and orphaned connections
*/

