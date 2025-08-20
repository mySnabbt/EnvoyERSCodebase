import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './EnvoyAI.css';

const EnvoyAI = () => {
  const { currentUser, isAdmin } = useAuth();
  const [messages, setMessages] = useState(() => {
    // Load messages from localStorage if available
    const savedMessages = localStorage.getItem('envoyai_messages');
    if (savedMessages) {
      try {
        return JSON.parse(savedMessages);
      } catch (e) {
        console.error('Error parsing saved messages', e);
      }
    }
    // Default welcome message
    return [
      { id: 1, text: 'Welcome to EnvoyAI! You can use commands starting with "/" or just chat naturally. Type /help to see available commands.', sender: 'system' }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  // Available commands state removed since command buttons are removed
  const [loading, setLoading] = useState(false);
  const [chatMode] = useState('hybrid'); // Hardcoded to hybrid mode
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebugPanel] = useState(false); // Debug panel always hidden
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('envoyai_messages', JSON.stringify(messages));
  }, [messages]);
  
  // Chat mode is hardcoded to hybrid, no need to save to localStorage
  
  // Command fetching removed since command buttons are removed
  useEffect(() => {
    
    // Clear chat history on the backend when component mounts
    const clearChatHistory = async () => {
      try {
        await axios.post('/chat/clear');
        // After clearing on the backend, reset the local messages
        setMessages([
          { id: Date.now(), text: 'Welcome to EnvoyAI! You can use commands starting with "/" or just chat naturally. Type /help to see available commands.', sender: 'system' }
        ]);
      } catch (error) {
        console.error('Error clearing chat history:', error);
      }
    };
    
    clearChatHistory();
  }, [currentUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when component mounts and after messages change
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-focus input after messages change (after sending/receiving messages)
  useEffect(() => {
    if (inputRef.current && !loading) {
      // Small delay to ensure DOM updates are complete
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [messages, loading]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const addMessage = (text, sender = 'user') => {
    const newMessage = {
      id: Date.now(), // Use timestamp for unique ID
      text,
      sender,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  const processCommand = async (commandText) => {
    // Extract the command and arguments
    const parts = commandText.trim().split(' ');
    const command = parts[0]; // Keep the leading '/'
    const args = parts.slice(1);
    
    // Add a loading message
    const loadingMsgId = Date.now();
    setMessages(prevMessages => [
      ...prevMessages, 
      { id: loadingMsgId, text: 'Processing...', sender: 'system' }
    ]);
    setLoading(true);
    
    try {
      // Send the command to the backend
      const response = await axios.post('/chat/command', {
        command,
        args
      });
      
      // Remove the loading message
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== loadingMsgId)
      );
      
      // Update debug logs if available
      if (response.data?.data?.debugLogs) {
        setDebugLogs(response.data.data.debugLogs);
      }
      
      // Add the response
      if (response.data?.success) {
        addMessage(response.data.data.response, 'system');
      } else {
        addMessage(`Error: ${response.data?.message || 'Something went wrong'}`, 'system');
      }
    } catch (error) {
      console.error(`Error processing command ${command}:`, error);
      
      // Remove the loading message
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== loadingMsgId)
      );
      
      // Show error message
      if (error.response?.data?.message) {
        addMessage(`Error: ${error.response.data.message}`, 'system');
      } else {
        addMessage('An error occurred while processing your command.', 'system');
      }
    } finally {
      setLoading(false);
      // Restore focus after command processing
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };
  
  const processMessage = async (messageText) => {
    // Add a loading message
    const loadingMsgId = Date.now();
    setMessages(prevMessages => [
      ...prevMessages, 
      { id: loadingMsgId, text: 'Processing...', sender: 'system' }
    ]);
    setLoading(true);
    
    try {
      // Send the message to the backend
      const response = await axios.post('/chat/message', {
        message: messageText
      });
      
      // Remove the loading message
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== loadingMsgId)
      );
      
      // Update debug logs if available
      if (response.data?.data?.debugLogs) {
        setDebugLogs(response.data.data.debugLogs);
      }
      
      // Add the response
      if (response.data?.success) {
        addMessage(response.data.data.response, 'system');
      } else {
        addMessage(`Error: ${response.data?.message || 'Something went wrong'}`, 'system');
      }
    } catch (error) {
      console.error(`Error processing message:`, error);
      
      // Remove the loading message
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== loadingMsgId)
      );
      
      // Show error message
      if (error.response?.data?.message) {
        addMessage(`Error: ${error.response.data.message}`, 'system');
      } else {
        addMessage('An error occurred while processing your message.', 'system');
      }
    } finally {
      setLoading(false);
      // Restore focus after message processing
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    const userInput = inputValue.trim();
    // Add user message to chat
    addMessage(userInput, 'user');
    setInputValue('');
    
    // Keep focus on input after clearing
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
    
    if (userInput.startsWith('/')) {
      // Always process commands with the command endpoint
      await processCommand(userInput);
    } else if (chatMode === 'command') {
      // In command-only mode, remind the user to use commands
      addMessage("I'm a command-based assistant. Please use commands starting with '/' (e.g., /help)", 'system');
    } else {
      // In chat or hybrid mode, process as a message
      await processMessage(userInput);
    }
  };

  // Command suggestion and help click handlers removed
  
  // Chat mode toggle removed - hardcoded to hybrid
  
  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([
        { id: Date.now(), text: 'Chat history cleared. Welcome back to EnvoyAI!', sender: 'system' }
      ]);
      // Restore focus after clearing chat
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };
  // Debug panel toggle removed

  return (
    <div className="envoyai-container">
      <div className="envoyai-chat">
        <div className="envoyai-header">
          <h2>EnvoyAI Assistant</h2>
          <div className="header-controls">
            <div className="clear-chat" onClick={clearChat} title="Clear chat history">
              Clear
            </div>
          </div>
        </div>
        
        <div className="envoyai-messages" onClick={() => inputRef.current?.focus()}>
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.sender}`}
            >
              <div className="message-content">
                {message.text.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Command suggestions and help button removed for cleaner interface */}
        
        <form className="envoyai-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type your message or write /help to see available commands..."
            ref={inputRef}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
        
        {/* Debug panel removed */}
      </div>
    </div>
  );
};

export default EnvoyAI; 