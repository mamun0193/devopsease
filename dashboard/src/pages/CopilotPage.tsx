import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Cpu, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import RecommendationCard from '../components/Copilot/RecommendationCard';
import type { RecommendationProps } from '../components/Copilot/RecommendationCard';

interface CopilotMessage {
  _id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  explainability?: {
    confidence: number;
    skillInvoked: string;
    affectedResources: any[];
    knowledgeObjectsUsed?: string[];
  };
}

export default function CopilotPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationProps[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchRecommendations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchConversations = async () => {
    try {
      const res = await axios.get('/api/ai/conversations');
      setConversations(res.data);
      if (res.data.length > 0 && !activeConvId) {
        setActiveConvId(res.data[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await axios.get('/api/ai/recommendations');
      setRecommendations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await axios.get(`/api/ai/conversations/${convId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const createConversation = async () => {
    try {
      const res = await axios.post('/api/ai/conversations', { title: 'New Analysis' });
      setConversations([res.data, ...conversations]);
      setActiveConvId(res.data._id);
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConvId) return;

    const userMsg: CopilotMessage = { _id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`/api/ai/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // assuming standard setup
        },
        body: JSON.stringify({ message: userMsg.content })
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let assistantMsg: CopilotMessage = { _id: (Date.now()+1).toString(), role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMsg]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\\n\\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            if (data.error) {
              assistantMsg.content += '\\n**Error:** ' + data.error;
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
            } else if (data.chunk) {
              assistantMsg.content += data.chunk;
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
            } else if (data.done) {
              // Final message payload with explainability
              assistantMsg = data.message;
              setMessages(prev => [...prev.slice(0, -1), assistantMsg]);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-slate-950 overflow-hidden text-slate-300">
      
      {/* LEFT PANE: Context & Recommendations */}
      <div className="w-1/3 border-r border-slate-800 p-6 overflow-y-auto hidden lg:block custom-scrollbar">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
            <Cpu className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Copilot</h2>
            <p className="text-xs text-slate-400">Intelligent Reasoning Layer</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
            <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
            Active Recommendations
          </h3>
          
          {recommendations.length === 0 ? (
            <div className="text-sm text-slate-500 text-center p-6 border border-dashed border-slate-700 rounded-xl">
              Platform is fully optimized. No active recommendations.
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map(rec => (
                <RecommendationCard key={rec.title} rec={rec} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Chat */}
      <div className="flex-1 flex flex-col h-full bg-slate-900/50">
        
        {/* Header */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900">
          <select 
            className="bg-slate-950 border border-slate-800 text-sm rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={activeConvId || ''}
            onChange={(e) => setActiveConvId(e.target.value)}
          >
            {conversations.map(c => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
          <button 
            onClick={createConversation}
            className="text-sm px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            New Analysis
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <Cpu className="w-12 h-12 opacity-20" />
              <p>Ask DevOpsEase Copilot about deployments, architecture, or failures.</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg._id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-5 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'bg-slate-800 border border-slate-700 shadow-xl'
              }`}>
                {msg.role === 'assistant' && msg.explainability && (
                  <div className="flex items-center space-x-3 mb-3 pb-3 border-b border-slate-700/50 text-xs">
                    <span className="text-slate-400 font-medium">Skill: <span className="text-indigo-400">{msg.explainability.skillInvoked}</span></span>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-slate-400 font-medium flex items-center">
                      Confidence: 
                      <span className={`ml-1 ${msg.explainability.confidence > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {msg.explainability.confidence}%
                      </span>
                    </span>
                  </div>
                )}
                
                <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>

                {msg.role === 'assistant' && msg.explainability && msg.explainability.knowledgeObjectsUsed && msg.explainability.knowledgeObjectsUsed.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-wrap gap-2">
                    <span className="text-xs text-slate-500 mr-1 mt-1">Context:</span>
                    {msg.explainability.knowledgeObjectsUsed.map((obj: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-900 rounded text-xs text-slate-400 font-mono border border-slate-700">
                        {obj}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex items-center space-x-3">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                <span className="text-sm text-slate-400">Analyzing platform state...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <form onSubmit={sendMessage} className="relative max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Copilot (e.g., 'Why did the last frontend deployment fail?')"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-4 pr-12 py-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
              disabled={loading || !activeConvId}
            />
            <button 
              type="submit"
              disabled={loading || !input.trim() || !activeConvId}
              className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-2 text-xs text-slate-500 flex items-center justify-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            AI Copilot uses structured platform knowledge. It may produce inaccurate results. Verify critical actions.
          </div>
        </div>

      </div>
    </div>
  );
}
