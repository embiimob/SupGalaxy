/**
 * Global Player Chat System
 * Handles chat messaging between players using WebRTC data channels
 */

// Chat message history (stores last 100 messages)
const chatHistory = [];
const MAX_CHAT_HISTORY = 100;

// Chat UI state
let isChatOpen = false;
let isChatInputFocused = false;

/**
 * Initialize chat system
 * Sets up event listeners and UI bindings
 */
function initChat() {
    const chatButton = document.getElementById('chatButton');
    const chatPanel = document.getElementById('chatPanel');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const chatClose = document.getElementById('chatClose');
    const chatHistory = document.getElementById('chatHistory');

    // Open chat panel when button is clicked
    if (chatButton) {
        chatButton.addEventListener('click', openChatPanel);
    }

    // Close chat panel
    if (chatClose) {
        chatClose.addEventListener('click', closeChatPanel);
    }

    // Send message on button click
    if (chatSend) {
        chatSend.addEventListener('click', sendChatMessage);
    }

    // Send message on Enter key
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });

        // Track input focus state
        chatInput.addEventListener('focus', () => {
            isChatInputFocused = true;
        });

        chatInput.addEventListener('blur', () => {
            isChatInputFocused = false;
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isChatOpen) {
            closeChatPanel();
        }
    });

    console.log('[Chat] Chat system initialized');
}

/**
 * Open the chat panel and focus the input
 */
function openChatPanel() {
    const chatPanel = document.getElementById('chatPanel');
    const chatInput = document.getElementById('chatInput');
    
    if (!chatPanel) return;

    isChatOpen = true;
    chatPanel.style.display = 'flex';
    
    // Focus the input after a short delay to ensure panel is visible
    setTimeout(() => {
        if (chatInput) {
            chatInput.focus();
        }
        // Auto-scroll to bottom of chat history
        scrollChatToBottom();
    }, 100);

    console.log('[Chat] Chat panel opened');
}

/**
 * Close the chat panel and return focus to game
 */
function closeChatPanel() {
    const chatPanel = document.getElementById('chatPanel');
    
    if (!chatPanel) return;

    isChatOpen = false;
    chatPanel.style.display = 'none';
    
    console.log('[Chat] Chat panel closed');
}

/**
 * Send a chat message
 */
function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    
    if (!chatInput) return;

    const message = chatInput.value.trim();
    
    // Don't send empty messages
    if (!message) return;

    // Check if WebRTC is connected
    const connectedPeers = Array.from(peers.entries()).filter(([username, peer]) => 
        peer.dc && peer.dc.readyState === 'open'
    );

    if (connectedPeers.length === 0) {
        addMessage('No players connected. Cannot send message.', 3000);
        return;
    }

    // Create chat message object
    const chatMessage = {
        type: 'chat',
        username: userName,
        text: message,
        timestamp: Date.now()
    };

    // Send to all connected peers via WebRTC
    for (const [peerUsername, peer] of connectedPeers) {
        try {
            peer.dc.send(JSON.stringify(chatMessage));
        } catch (error) {
            console.error(`[Chat] Failed to send message to ${peerUsername}:`, error);
        }
    }

    // Add to local chat history (optimistic update)
    addChatMessage(userName, message, chatMessage.timestamp);

    // Display in normal message area
    addMessage(`${userName}: ${message}`, 5000);

    // Clear input
    chatInput.value = '';

    console.log('[Chat] Message sent:', message);
}

/**
 * Handle incoming chat message from WebRTC
 * @param {object} data - Chat message data with username, text, timestamp
 */
function handleIncomingChatMessage(data) {
    if (!data || !data.username || !data.text) {
        console.warn('[Chat] Received invalid chat message:', data);
        return;
    }

    // Don't add duplicate messages from self (already added in sendChatMessage)
    if (data.username === userName) {
        return;
    }

    // Add to chat history
    addChatMessage(data.username, data.text, data.timestamp);

    // Display in normal message area
    addMessage(`${data.username}: ${data.text}`, 5000);

    console.log('[Chat] Received message from', data.username);
}

/**
 * Add a message to the chat history
 * @param {string} username - Sender's username
 * @param {string} text - Message text
 * @param {number} timestamp - Message timestamp
 */
function addChatMessage(username, text, timestamp) {
    // Add to history array
    chatHistory.push({
        username,
        text,
        timestamp
    });

    // Keep only last 100 messages
    if (chatHistory.length > MAX_CHAT_HISTORY) {
        chatHistory.shift();
    }

    // Update UI
    updateChatHistoryUI();

    // Auto-scroll to bottom if user is already at bottom
    const chatHistoryEl = document.getElementById('chatHistory');
    if (chatHistoryEl) {
        const isScrolledToBottom = chatHistoryEl.scrollHeight - chatHistoryEl.clientHeight <= chatHistoryEl.scrollTop + 50;
        if (isScrolledToBottom || isChatOpen) {
            setTimeout(scrollChatToBottom, 10);
        }
    }
}

/**
 * Update the chat history UI with all messages
 */
function updateChatHistoryUI() {
    const chatHistoryEl = document.getElementById('chatHistory');
    
    if (!chatHistoryEl) return;

    // Clear existing messages
    chatHistoryEl.innerHTML = '';

    // Add all messages from history
    for (const msg of chatHistory) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'chat-username';
        usernameSpan.textContent = msg.username + ': ';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'chat-text';
        textSpan.textContent = msg.text;
        
        messageDiv.appendChild(usernameSpan);
        messageDiv.appendChild(textSpan);
        
        chatHistoryEl.appendChild(messageDiv);
    }
}

/**
 * Scroll chat history to bottom
 */
function scrollChatToBottom() {
    const chatHistoryEl = document.getElementById('chatHistory');
    if (chatHistoryEl) {
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }
}

/**
 * Handle "/" key to open chat
 * Called from main keyboard event handler
 */
function handleSlashKeyForChat(event) {
    // Don't open chat if any modal is already open
    if (isPromptOpen) return false;

    // Open chat panel
    openChatPanel();
    
    // Prevent the "/" from being typed in the input
    event.preventDefault();
    
    return true;
}

/**
 * Check if chat input is currently focused
 * Used to prevent game controls from interfering
 */
function isChatInputActive() {
    return isChatInputFocused;
}

// Export functions for use in other modules
window.initChat = initChat;
window.handleIncomingChatMessage = handleIncomingChatMessage;
window.handleSlashKeyForChat = handleSlashKeyForChat;
window.isChatInputActive = isChatInputActive;
