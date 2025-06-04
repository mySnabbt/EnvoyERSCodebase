import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './EnvoyAI.css';

const EnvoyAI = () => {
  const { currentUser, isAdmin } = useAuth();
  const [messages, setMessages] = useState([
    { id: 1, text: 'Welcome to EnvoyAI! Type /help to see available commands or click on a suggested command below.', sender: 'system' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [availableCommands, setAvailableCommands] = useState([]);
  const [loading, setLoading] = useState(false);
  
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
    
    fetchCommands();
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
      id: messages.length + 1,
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
    addMessage('Processing...', 'system');
    setLoading(true);
    
    try {
      // Send the command to the backend
      const response = await axios.post('/chat/command', {
        command,
        args
      });
      
      // Remove the loading message
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.text !== 'Processing...')
      );
      
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
        prevMessages.filter(msg => msg.text !== 'Processing...')
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    const userInput = inputValue.trim();
    addMessage(userInput);
    setInputValue('');
    
    if (userInput.startsWith('/')) {
      await processCommand(userInput);
    } else {
      addMessage("I'm a command-based assistant. Please use commands starting with '/' (e.g., /help)", 'system');
    }
  };

  const handleCommandSuggestionClick = (command) => {
    setInputValue(command);
    inputRef.current.focus();
  };

  const handleHelpClick = () => {
    processCommand('/help');
  };

  return (
    <div className="envoyai-container">
      <div className="envoyai-chat">
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
            placeholder="Type a command (e.g., /help)"
            ref={inputRef}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default EnvoyAI; 