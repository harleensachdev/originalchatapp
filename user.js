$(function () {
    var socket = io('/user');
    var userId; // Store the user ID

    // Prompt the user to enter a username
    do {
        userId = prompt("Please enter your username:");
    } while (!userId);

    // Register the user with the chosen user ID
    socket.emit('register user', userId);

    // Function to append a new message to the chat history
    function appendMessage(message) {
        var chatHistory = $('#userchatHistory'); // Ensure this selector targets the correct element
        if (chatHistory) {
            chatHistory.append($('<li>').text(message));
            chatHistory.scrollTop(chatHistory[0].scrollHeight);
        } else {
            console.error("Chat history element not found.");
        }
    }

    // Function to display the entire chat history
    function displayChatHistory(history) {
        var chatHistory = $('#userchatHistory'); // Ensure this selector targets the correct element
        chatHistory.empty(); // Clear existing content
        history.forEach(function (message) {
            appendMessage(`(${message.userId}): ${message.msg}`);
        });
    }

    // Request chat history upon connection
    socket.on('connect', function () {
        console.log('yes please')
        socket.emit('get chat history', userId); // Emit get chat history upon connection
    });

    // Receive chat history
    socket.on('chat history', function (history) {
        console.log('Received chat history:', history);
        displayChatHistory(history); // Display the chat history
    });

    // Send private messages to admin
    $('#sendUserMessageBtn').click(function () {
        var userMessage = $('#userMessage').val();
        console.log('Sending message:', userMessage);
        socket.emit('user private message', { userId, msg: userMessage });
        $('#userMessage').val(''); // Clear input after sending message
    });

    // Receive private messages from admin
    socket.on('admin private message', function ({ userId, msg, isUser }) {
        console.log(`(${userId}): ${msg}`);
        appendMessage(`(${userId}): ${msg}`);
    });

    // Handle the event when the username is already taken
    socket.on('username taken', function (takenUsername) {
        // Display a warning message to the user
        $('#usernameAvailability').text(`Warning: Username '${takenUsername}' is an existing users username, if this is not your username, please close this tab and register with another anonymous username instead.`);
        $('#usernameAvailability').show(); // Show the warning message
        setTimeout(function () {
            $('#usernameAvailability').hide();
        }, 10000); // Hide the message after 10 seconds
    });
});
