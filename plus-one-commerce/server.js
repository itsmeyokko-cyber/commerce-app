// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(server);

// --- Configuration ---
// Use environment port for hosting (e.g., Render) or default to 3000
const PORT = process.env.PORT || 3000; 
const CHAT_PASSWORD = 'CommerceTutor2025'; // The secret password for chat access

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory user count to enforce the 2-user limit for the chat room
let activeChatUsers = 0;

io.on('connection', (socket) => {
    console.log('A user connected');

    let isAuthenticated = false;
    let isStudent = false; // Flag to assign the role of 'Student' or 'Tutor'

    // Handle initial connection request and password check
    socket.on('chat_auth', (password) => {
        if (password === CHAT_PASSWORD) {
            
            // Check for the maximum two user limit
            if (activeChatUsers < 2) {
                isAuthenticated = true;
                activeChatUsers++;
                isStudent = (activeChatUsers === 1); // First user is student, second is tutor
                
                // Join a specific room for the two-user chat
                socket.join('plus_one_chat');
                
                // Send success confirmation and the user's role back to the client
                socket.emit('auth_success', isStudent ? 'student' : 'tutor');
                
                // Notify the other user (if present) about the new connection
                io.to('plus_one_chat').emit('user_status', `${isStudent ? 'Student' : 'Tutor'} connected. Total: ${activeChatUsers}`);
                
            } else {
                // Too many users
                socket.emit('auth_fail', 'Chat room is full (2 users max).');
                socket.disconnect();
            }

        } else {
            // Password failed
            socket.emit('auth_fail', 'Invalid password.');
        }
    });

    // Handle incoming chat messages
    socket.on('chat_message', (msg) => {
        if (isAuthenticated) {
            // Broadcast the message to all clients in the 'plus_one_chat' room
            io.to('plus_one_chat').emit('chat_message', {
                user: isStudent ? 'Student' : 'Tutor',
                text: msg
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
        if (isAuthenticated) {
            activeChatUsers = Math.max(0, activeChatUsers - 1);
            
            // Notify the remaining user that the other has left
            io.to('plus_one_chat').emit('user_status', `${isStudent ? 'Student' : 'Tutor'} disconnected. Total: ${activeChatUsers}`);
        }
    });
});

// Start the server listening on the configured port
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
