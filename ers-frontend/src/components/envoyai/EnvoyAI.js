import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './EnvoyAI.css';
import AIDebugPanel from './AIDebugPanel';
import './AIDebugPanel.css';

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
  const [availableCommands, setAvailableCommands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState(() => {
    // Load chat mode from localStorage if available
    return localStorage.getItem('envoyai_mode') || 'hybrid';
  });
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebugPanel, setShowDebugPanel] = useState(() => {
    // Check if debug panel should be shown (admin only)
    return isAdmin && localStorage.getItem('show_debug_panel') === 'true';
  });
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('envoyai_messages', JSON.stringify(messages));
  }, [messages]);
  
  // Save chat mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('envoyai_mode', chatMode);
  }, [chatMode]);
  
  // Save debug panel visibility preference
  useEffect(() => {
    localStorage.setItem('show_debug_panel', showDebugPanel.toString());
  }, [showDebugPanel]);
  
  // Load available commands when component mounts
  useEffect(() => {
    const fetchCommands = async () => {
      try {
        const response = await axios.get('/chat/commands');
        if (response.data?.success) {
          const commandsText = response.data.data.response;
          // Parse commands from response text
          const commandLines = commandsText.split('\n').slice(1); // Skip the first line ("Available commands:")
          
          const parsedCommands = commandLines.map(line => {
            const match = line.match(/^\/([a-z]+) - (.+)$/);
            if (match) {
              return {
                text: `/${match[1]}`,
                description: match[2]
              };
            }
            return null;
          }).filter(Boolean);
          
          // Separate common and admin commands
          const adminCmds = parsedCommands.filter(cmd => 
            cmd.description.toLowerCase().includes('admin only')
          );
          
          const commonCmds = parsedCommands.filter(cmd => 
            !cmd.description.toLowerCase().includes('admin only')
          );
          
          setAvailableCommands({
            common: commonCmds,
            admin: adminCmds
          });
        }
      } catch (error) {
        console.error('Error fetching commands:', error);
        addMessage('Failed to fetch available commands. Please try again later.', 'system');
      }
    };
    
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
    
    fetchCommands();
    clearChatHistory();
  }, [currentUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    const userInput = inputValue.trim();
    // Add user message to chat
    addMessage(userInput, 'user');
    setInputValue('');
    
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

  const handleCommandSuggestionClick = (command) => {
    setInputValue(command);
    inputRef.current.focus();
  };

  const handleHelpClick = () => {
    processCommand('/help');
  };
  
  const toggleChatMode = () => {
    if (chatMode === 'command') {
      setChatMode('chat');
      addMessage('Switched to chat mode. You can now talk naturally.', 'system');
    } else if (chatMode === 'chat') {
      setChatMode('hybrid');
      addMessage('Switched to hybrid mode. You can use commands or talk naturally.', 'system');
    } else {
      setChatMode('command');
      addMessage('Switched to command mode. Please use commands starting with /.', 'system');
    }
  };
  
  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([
        { id: Date.now(), text: 'Chat history cleared. Welcome back to EnvoyAI!', sender: 'system' }
      ]);
    }
  };
  
  const toggleDebugPanel = () => {
    setShowDebugPanel(!showDebugPanel);
  };

  return (
    <div className="envoyai-container">
      <div className="envoyai-chat">
        <div className="envoyai-header">
          <h2>EnvoyAI Assistant</h2>
          <div className="header-controls">
            <div className="mode-toggle" onClick={toggleChatMode}>
              Mode: {chatMode === 'command' ? 'Commands' : chatMode === 'chat' ? 'Chat' : 'Hybrid'}
            </div>
            <div className="clear-chat" onClick={clearChat} title="Clear chat history">
              Clear
            </div>
            {isAdmin && (
              <div 
                className={`debug-toggle ${showDebugPanel ? 'active' : ''}`} 
                onClick={toggleDebugPanel}
                title="Toggle debug panel"
              >
                Debug
              </div>
            )}
          </div>
        </div>
        
        <div className="envoyai-messages">
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

        <div className="command-suggestions">
          {availableCommands.common && availableCommands.common.map(cmd => (
            <div 
              key={cmd.text} 
              className="command-suggestion"
              onClick={() => handleCommandSuggestionClick(cmd.text)}
              title={cmd.description}
            >
              {cmd.text}
            </div>
          ))}
          
          {isAdmin && availableCommands.admin && availableCommands.admin.map(cmd => (
            <div 
              key={cmd.text} 
              className="command-suggestion"
              onClick={() => handleCommandSuggestionClick(cmd.text)}
              title={cmd.description}
            >
              {cmd.text}
            </div>
          ))}
        </div>
        
        <div className="help-button" onClick={handleHelpClick} title="Show available commands">
          /help
        </div>
        
        <form className="envoyai-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={chatMode === 'command' ? "Type a command (e.g., /help)" : "Type a message or command..."}
            ref={inputRef}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
        
        {/* Debug panel for admins */}
        <AIDebugPanel logs={debugLogs} visible={isAdmin && showDebugPanel} />
      </div>
    </div>
  );
};

export default EnvoyAI; 