"use client";

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2, Mail, Phone, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showContactOptions, setShowContactOptions] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneModalType, setPhoneModalType] = useState<'phone' | 'whatsapp'>('phone');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m PawaBot, your voting assistant. How can I help you today?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.3;
    const numSamples = sampleRate * duration;
    const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      if (t < 0.15) {
        channelData[i] = Math.sin(2 * Math.PI * 800 * t) * 0.3 * (1 - t / 0.15);
      } else {
        channelData[i] = Math.sin(2 * Math.PI * 1000 * t) * 0.3 * (1 - (t - 0.15) / 0.15);
      }
    }

    const wavData = audioBufferToWav(audioBuffer);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    const audio = new Audio(url);
    audio.volume = 0.5;
    audioRef.current = audio;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    const enableAudio = () => {
      if (!audioEnabled && audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
          setAudioEnabled(true);
        }).catch(() => {
        });
      }
    };
    window.addEventListener('click', enableAudio, { once: true });
    window.addEventListener('touchstart', enableAudio, { once: true });
    window.addEventListener('keydown', enableAudio, { once: true });
    

    return () => {
      window.removeEventListener('click', enableAudio);
      window.removeEventListener('touchstart', enableAudio);
      window.removeEventListener('keydown', enableAudio);
    };
  }, [audioEnabled]);

  // Play notification sound and show alert after audio is enabled
  useEffect(() => {
    if (audioEnabled && !hasPlayedSound) {
      const timer = setTimeout(() => {
        playNotificationSound();
        setShowNotification(true);
        setHasPlayedSound(true);
        
        // Hide notification after 5 seconds
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [audioEnabled, hasPlayedSound]);

  const playNotificationSound = () => {
    if (audioRef.current && audioEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.log('Audio playback failed:', error);
      });
    }
  };

  // Helper function to convert AudioBuffer to WAV
  function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // "RIFF" chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // "fmt " sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // subchunk1size
    setUint16(1); // audio format (1 = PCM)
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // byte rate
    setUint16(buffer.numberOfChannels * 2); // block align
    setUint16(16); // bits per sample

    // "data" sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // subchunk2size

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleChatButtonClick = () => {
    setShowContactOptions(true);
  };

  const handleContactOptionSelect = (option: 'chatbot' | 'email' | 'phone' | 'whatsapp') => {
    setShowContactOptions(false);
    
    switch (option) {
      case 'chatbot':
        setIsOpen(true);
        break;
      case 'email':
        window.location.href = 'mailto:pawavotes@gmail.com?subject=Support Request';
        break;
      case 'phone':
        setPhoneModalType('phone');
        setShowPhoneModal(true);
        break;
      case 'whatsapp':
        setPhoneModalType('whatsapp');
        setShowPhoneModal(true);
        break;
    }
  };

  const handlePhoneSelect = (phoneNumber: string) => {
    setShowPhoneModal(false);
    
    if (phoneModalType === 'phone') {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      const whatsappNumber = phoneNumber.replace(/\+/g, '').replace(/\s/g, '');
      window.open(`https://wa.me/${whatsappNumber}?text=Hello, I need help with PawaVotes`, '_blank');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId,
        }),
      });

      const data = await response.json();

      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response || 'Sorry, I couldn\'t process that. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 500);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I\'m having trouble connecting. Please try again later.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    'How to vote?',
    'USSD voting',
    'Payment methods',
    'Check results',
  ];

  return (
    <>
      {/* Phone Number Selection Modal */}
      <AnimatePresence>
        {showPhoneModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPhoneModal(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-96 max-w-[90vw]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {phoneModalType === 'phone' ? 'Select Phone Number' : 'Select WhatsApp Number'}
                </h3>
                <button
                  onClick={() => setShowPhoneModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Choose a number to {phoneModalType === 'phone' ? 'call' : 'chat on WhatsApp'}:
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handlePhoneSelect('+233552732025')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-green-50 transition-colors border-2 border-gray-200 hover:border-green-600 group"
                >
                  <div className="bg-green-100 group-hover:bg-green-600 p-3 rounded-full transition-colors">
                    <Phone className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900 text-base">+233 55 273 2025</p>
                    <p className="text-xs text-gray-500">Primary support line</p>
                  </div>
                </button>

                <button
                  onClick={() => handlePhoneSelect('+233543194406')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-colors border-2 border-gray-200 hover:border-blue-600 group"
                >
                  <div className="bg-blue-100 group-hover:bg-blue-600 p-3 rounded-full transition-colors">
                    <Phone className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900 text-base">+233 54 319 4406</p>
                    <p className="text-xs text-gray-500">Alternative support line</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowPhoneModal(false)}
                className="w-full mt-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notification Alert */}
      <AnimatePresence>
        {showNotification && !isOpen && !showContactOptions && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 100 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 100 }}
            className="fixed bottom-24 right-6 z-40 bg-white rounded-lg shadow-xl p-4 max-w-xs border-l-4 border-green-600"
          >
            <div className="flex items-start gap-3">
              <div className="bg-green-100 rounded-full p-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm">Need Help?</h4>
                <p className="text-gray-600 text-xs mt-1">Chat with us for instant support!</p>
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Options Modal */}
      <AnimatePresence>
        {showContactOptions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-24 right-6 z-50 bg-white rounded-2xl shadow-2xl p-6 w-80"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Contact Us</h3>
              <button
                onClick={() => setShowContactOptions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">Choose how you'd like to reach us:</p>
            
            <div className="space-y-2">
              <button
                onClick={() => handleContactOptionSelect('chatbot')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors border border-gray-200 hover:border-green-600"
              >
                <div className="bg-green-100 p-2 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 text-sm">Chat with AI Bot</p>
                  <p className="text-xs text-gray-500">Instant automated support</p>
                </div>
              </button>

              <button
                onClick={() => handleContactOptionSelect('email')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors border border-gray-200 hover:border-blue-600"
              >
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 text-sm">Email Us</p>
                  <p className="text-xs text-gray-500">pawavotes@gmail.com</p>
                </div>
              </button>

              <button
                onClick={() => handleContactOptionSelect('phone')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors border border-gray-200 hover:border-purple-600"
              >
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 text-sm">Call Us</p>
                  <p className="text-xs text-gray-500">+233 55 273 2025 / +233 54 319 4406</p>
                </div>
              </button>

              <button
                onClick={() => handleContactOptionSelect('whatsapp')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors border border-gray-200 hover:border-green-600"
              >
                <div className="bg-green-100 p-2 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 text-sm">WhatsApp</p>
                  <p className="text-xs text-gray-500">Chat on WhatsApp</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && !showContactOptions && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={handleChatButtonClick}
            className="fixed bottom-6 right-6 z-50 bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg transition-colors group"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              1
            </span>
            {/* Pulse animation */}
            <span className="absolute inset-0 rounded-full bg-green-600 animate-ping opacity-75"></span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '60px' : '600px'
            }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-linear-to-r from-green-600 to-green-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">PawaBot</h3>
                  <p className="text-xs text-green-100">Online • Always here to help</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="hover:bg-white/20 p-1 rounded transition-colors"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 p-1 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          message.sender === 'user'
                            ? 'bg-green-600 text-white rounded-br-none'
                            : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'text-green-100' : 'text-gray-400'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length <= 2 && (
                  <div className="px-4 py-2 bg-white border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
                    <div className="flex flex-wrap gap-2">
                      {quickActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setInputMessage(action);
                            setTimeout(() => sendMessage(), 100);
                          }}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isTyping}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white p-2 rounded-full transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Powered by PawaVotes AI
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
