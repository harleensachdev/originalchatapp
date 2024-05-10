const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '/')));

// Socket.IO connection error handling
io.on('connect_error', (err) => {
    console.error('Socket.IO connection error:', err);
});

// Objects to store sockets and chat history
const userSockets = {};
const adminSockets = {};
const userChatHistory = {};
const adminChatHistory = {};

const userNamespace = io.of('/user');
const adminNamespace = io.of('/admin');

// Function to register a user
function registerUser(socket, chosenUserId) {
    userSockets[chosenUserId] = socket;
    console.log(`User ${chosenUserId} registered`);
}

// Function to handle user private messages
function handleUserPrivateMessage(socket, { userId, msg }) {
    const adminId = 'Admin';
    adminNamespace.emit('private message', { userId, msg, isUser: true });
    console.log(`User ${socket.id} sent a message to Admin: ${msg}`);

    // Update admin chat history
    adminChatHistory[adminId] = adminChatHistory[adminId] || [];
    adminChatHistory[adminId].push({ userId, msg, isUser: true });

    // Update user chat history
    userChatHistory[userId] = userChatHistory[userId] || [];
    userChatHistory[userId].push({ userId, msg, isUser: true });

    // Emit chat history to the user
    userNamespace.to(socket.id).emit('chat history', userChatHistory[userId]);
}

// Function to retrieve chat history for a user
function getChatHistory(userId) {
    return userChatHistory[userId] || [];
}

// Function to handle socket disconnect
function handleDisconnect(socket) {
    console.log(`User/Admin ${socket.id} disconnected`);
    const socketId = socket.id;
    if (userSockets.hasOwnProperty(socketId)) {
        delete userSockets[socketId];
    }
    if (adminSockets.hasOwnProperty(socketId)) {
        delete adminSockets[socketId];
    }
}

// User namespace connection event
userNamespace.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('register user', (chosenUserId) => {
        if (userSockets[chosenUserId]) {
            // Warn the user if the username is already taken
            socket.emit('username taken', chosenUserId);
        } else {
            registerUser(socket, chosenUserId);

            // Inform admin about new user
            if (Object.keys(adminSockets).length > 0) {
                adminNamespace.emit('new user', chosenUserId);
            }
        }
    });

    socket.on('user private message', (data) => {
        handleUserPrivateMessage(socket, data);
    });

    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });

    // Send chat history to the user when requested
    socket.on('get chat history', (userId) => {
        const chatHistory = getChatHistory(userId);
        userNamespace.to(socket.id).emit('chat history', chatHistory);
    });
});

// Admin namespace connection event
adminNamespace.on('connection', (socket) => {
    console.log('Admin connected');
    const adminId = socket.id;
    adminSockets[adminId] = socket;

    socket.on('admin private message', ({ userId, msg, isUser }) => {
        const targetNamespace = isUser ? '/user' : '/admin';
        if (isUser ? userSockets[userId] : adminSockets[userId]) {
            io.of(targetNamespace).to(userId).emit('private message', { userId: adminId, msg, isUser });
        }

        console.log(`Admin ${adminId} sent a message to ${isUser ? 'User' : 'Admin'} ${userId}: ${msg}`);

        // Update chat history and emit to the user
        if (isUser) {
            userChatHistory[userId] = userChatHistory[userId] || [];
            userChatHistory[userId].push({ userId: adminId, msg: `Admin: ${msg}`, isUser });
            if (userSockets[userId]) {
                userNamespace.to(userSockets[userId].id).emit('chat history', userChatHistory[userId]);
            } else {
                console.log(`User ${userId} socket does not exist.`);
            }
        } else {
            adminChatHistory[adminId] = adminChatHistory[adminId] || [];
            adminChatHistory[adminId].push({ userId, msg, isUser });
        }
    });

    socket.on('get chat history', (userId) => {
        const chatHistory = getChatHistory(userId) || [];
        console.log('Sending chat history to Admin:', chatHistory);
        socket.emit('chat history', chatHistory);
    });

    // Send chat history to admin if available
    if (Object.keys(userChatHistory).length > 0) {
        socket.emit('new user', Object.keys(userChatHistory));
    }

    socket.on('disconnect', () => {
        handleDisconnect(socket);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
