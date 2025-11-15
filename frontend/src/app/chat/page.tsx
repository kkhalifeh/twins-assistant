'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, MessageSquare, Lightbulb } from 'lucide-react'
import api from '@/lib/api'
import { format } from 'date-fns'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

interface Suggestion {
  text: string
  icon?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "👋 Hi! I'm your parenting assistant. I can help you log activities and answer questions about your children. Try saying things like 'Fed [child name] 120ml' or 'When was [child name] last fed?'",
      sender: 'bot',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch suggestions on mount
  useEffect(() => {
    fetchSuggestions()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchSuggestions = async () => {
    try {
      const response = await api.get('/chat/suggestions')
      setSuggestions(response.data)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)
    setShowSuggestions(false)

    try {
      // Send to backend
      const response = await api.post('/chat/message', { message: text })
      
      // Add bot response
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.message,
        sender: 'bot',
        timestamp: new Date(response.data.timestamp)
      }
      
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I couldn't process that message. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputText)
    }
  }

  const quickActions = [
    { text: "Fed", icon: "🍼" },
    { text: "Sleeping", icon: "😴" },
    { text: "Diaper", icon: "👶" },
    { text: "Summary", icon: "📊" },
  ]

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header - Mobile optimized */}
      <div className="bg-white border-b px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-1.5 sm:p-2 bg-primary-100 rounded-full">
            <MessageSquare className="w-5 sm:w-6 h-5 sm:h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">AI Assistant Chat</h1>
            <p className="text-xs sm:text-sm text-gray-600">Quick logging and activity tracking</p>
          </div>
        </div>
      </div>

      {/* Messages Area - Mobile optimized */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[85%] sm:max-w-[70%] ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                  message.sender === 'user'
                    ? 'bg-primary-100'
                    : 'bg-gray-200'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-primary-600" />
                  ) : (
                    <Bot className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`rounded-2xl px-3 sm:px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm sm:text-base break-words">{message.text}</p>
                  </div>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-right' : 'text-left'
                  } text-gray-500`}>
                    {format(message.timestamp, 'h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 bg-white border rounded-2xl px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-gray-500">Typing...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestions - Mobile optimized */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-white border-t px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center space-x-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-600">Suggestions</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {suggestions.slice(0, 4).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-2.5 sm:px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs sm:text-sm text-gray-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions - Mobile optimized */}
      <div className="bg-white border-t px-3 sm:px-4 py-2">
        <div className="flex space-x-1.5 sm:space-x-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => setInputText(prev => prev + ' ' + action.text)}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
            >
              <span>{action.icon}</span>
              <span>{action.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t px-4 py-4">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowSuggestions(false)}
            placeholder="Type a message... (e.g., 'Fed [child name] 120ml')"
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send • This mimics WhatsApp interaction
        </p>
      </div>
    </div>
  )
}
