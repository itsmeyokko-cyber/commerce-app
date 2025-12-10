// public/js/chat.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chatLink = document.getElementById('chat-link');
    const modal = document.getElementById('chat-modal');
    const closeButton = document.getElementsByClassName('close-button')[0];
    const authSection = document.getElementById('auth-section');
    const chatSection = document.getElementById('chat-section');
    const passwordInput = document.getElementById('chat-password');
    const authButton = document.getElementById('auth-button');
    const authMessage = document.getElementById('auth-message');
    const messages = document.getElementById('messages');
    const messageInput = document.getElementById('m');
    const sendButton = document.getElementById('send-button');

    let socket = null;
    let isTutor = false; // Flag to identify the user's role after successful login

    // --- Modal Control ---
    chatLink.onclick = function() {
        modal.style.display = 'block';
    }

    closeButton.onclick = function() {
        modal.style.display = 'none';
        // Disconnect socket when modal closes to manage the 2-user limit
        if (socket && socket.connected) {
            socket.disconnect();
            socket = null;
            // Reset UI for next attempt
            authSection.style.display = 'block';
            chatSection.style.display = 'none';
            messages.innerHTML = '';
            authMessage.textContent = '';
            passwordInput.value = '';
        }
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    // --- Authentication Logic ---
    authButton.onclick = function() {
        const password = passwordInput.value.trim();
        if (!password) {
            authMessage.textContent = "Please enter the password.";
            return;
        }

        // Initialize socket connection upon authentication attempt
        // The io() function is available because of the <script src="/socket.io/socket.io.js"></script> in index.html
        socket = io(); 

        socket.on('connect', () => {
            // Send the password to the server for validation
            socket.emit('chat_auth', password);
        });

        // Handle successful authentication
        socket.on('auth_success', (userRole) => {
            isTutor = (userRole === 'tutor');
            authSection.style.display = 'none';
            chatSection.style.display = 'flex'; // Show chat interface
            modal.querySelector('h2').textContent = `Chat: Logged in as ${userRole}`;
            
            addMessage('System', 'Welcome to the chat. Start typing!', 'system');
        });

        // Handle authentication failure
        socket.on('auth_fail', (reason) => {
            authMessage.textContent = reason;
            if (socket) socket.disconnect();
        });
        
        // Handle server messages (user connected/disconnected)
        socket.on('user_status', (status) => {
            addMessage('System', status, 'system');
        });

        // Handle incoming chat messages
        socket.on('chat_message', (data) => {
            // Determine if the message is 'me' (sent by this user's role) or 'other'
            const messageRole = data.user === (isTutor ? 'Tutor' : 'Student') ? 'me' : 'other';
            addMessage(data.user, data.text, messageRole);
        });
    }

    // --- Message Sending Logic ---
    sendButton.onclick = function() {
        sendMessage();
    }
    // Allow sending message by pressing Enter
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const msg = messageInput.value.trim();
        if (msg && socket && socket.connected) {
            socket.emit('chat_message', msg);
            messageInput.value = ''; // Clear input
        }
    }

    // Helper function to display messages
    function addMessage(user, text, type) {
        const item = document.createElement('div');
        item.classList.add('chat-message', type);
        item.innerHTML = `<strong>${user}:</strong> ${text}`;
        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight; // Auto-scroll to latest message
    }
});
