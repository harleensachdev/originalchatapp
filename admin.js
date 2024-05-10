$(function () {
    var socket = io('/admin');
    var pendingMessages = {}; // Store pending messages
    var activeTab = null; // Store the ID of the currently active tab
    localStorage.clear()
    // Error handling for Socket.IO connection
    socket.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err);
    });

    // Check Socket.IO connection status after connection is established
    socket.on('connect', function () {
        console.log('Socket.IO connection established:', socket.connected);
    });

    // Retrieve active tabs from local storage
    var storedTabs = JSON.parse(localStorage.getItem('activeTabs'));
    if (storedTabs) {
        storedTabs.forEach(tab => addTab(tab)); // Add each stored tab
    }

    // Function to append message to chat history
    function appendMessage(userId, message) {
        // Add tab if it doesn't exist
        addTab(userId);

        // If the tab is active, append the message
        if (activeTab === userId) {
            var chatHistory = $('#tabContent-' + userId);
            chatHistory.append($('<li>').text(message));
            chatHistory.scrollTop(chatHistory[0].scrollHeight);
        } else {
            // Store message if tab is not active
            if (!pendingMessages[userId]) {
                pendingMessages[userId] = [];
            }
            pendingMessages[userId].push(message);
        }
    }

    // Receive private messages from users
    socket.on('private message', function ({ userId, msg, isUser }) {
        console.log(`${userId}: ${msg}`);
        // Format the message as (userID: message)
        var formattedMsg = isUser ? `(${userId}): ${msg}` : `${userId} : ${msg}`;
        // Store the message
        appendMessage(userId, formattedMsg);
    });

    // Receive notification for new users
    socket.on('new user', function (userId) {
        console.log('New user:', userId);
        addTab(userId); // Add a new tab for the new user
    });

    // Receive chat history
    socket.on('chat history', function (history) {
        console.log('Received chat history:', history);

        // Clear existing chat history
        $('#tabContent-' + activeTab).empty();

        // Append each message to the chat history
        history.forEach(function (message) {
            // Format the message as (userID: message)
            var formattedMsg = `${message.userId} : ${message.msg}`;
            appendMessage(activeTab, formattedMsg);
        });
    });

    // Event listener for tab button click
    $(document).on('click', '.tab', function () {
        var userId = $(this).attr('data-userId');
        if (activeTab !== userId) {
            activateTab(userId); // Call activateTab function when button is clicked
            socket.emit('get chat history', userId);
            console.log("Requesting chat history for user ID:", userId);
        }
    });

    // Send private messages to a specific user
    $('#sendPrivateToUserBtn').click(function () {
        var targetUserId = $('#targetUserId').val();
        var privateToUserMsg = $('#privateToUserMsg').val();
        // Emit the private message to the specified user ID
        socket.emit('admin private message', { userId: targetUserId, msg: privateToUserMsg, isUser: true });
        // Display the sent message on the admin's side
        appendMessage(targetUserId, `(Admin): ${privateToUserMsg}`);
    });

    // Add a new tab for a user
    function addTab(userId) {
        // Check if the tab already exists
        if ($('#tabContent-' + userId).length === 0) {
            $('#tabs').append(`<button class="tab" data-userId="${userId}">${userId}</button>`);
            $('#tabContent').append(`<ul class="chat-history" id="tabContent-${userId}" style="display: none;"></ul>`); // Hide tab content initially
        }
    }

    // Activate a specific tab
    function activateTab(userId) {
        // Clear the chat history of the previously active tab
        if (activeTab) {
            $('#tabContent-' + activeTab).empty();
        }

        // Set the active tab
        activeTab = userId;

        // Hide all tab contents and show the chat history of the button clicked
        $('.tab-content').hide();
        $(`#tabContent-${userId}`).show();

        // Store active tabs in local storage
        var activeTabs = Array.from($('#tabs').children('.tab')).map(tab => $(tab).attr('data-userId'));
        localStorage.setItem('activeTabs', JSON.stringify(activeTabs));

        // Check for pending messages and append them if any
        if (pendingMessages[userId]) {
            pendingMessages[userId].forEach(function (message) {
                var chatHistory = $('#tabContent-' + userId);
                chatHistory.append($('<li>').text(message));
                chatHistory.scrollTop(chatHistory[0].scrollHeight);
            });
            // Clear pending messages for this user
            delete pendingMessages[userId];
        }
    }
    function clearTabs() {
        $('#tabs').empty(); // Remove all tab buttons
        $('#tabContent').empty(); // Remove all tab contents
    }
    // Initialize the dashboard with no active tab and no visible chat histories
    $('.tab-content').hide();
    clearTabs()
});

