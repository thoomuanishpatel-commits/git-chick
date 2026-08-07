'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Incident, Vehicle, Shelter, Hospital, Warehouse } from '../utils/mockData';

interface AIChatAssistantProps {
  incidents: Incident[];
  vehicles: Vehicle[];
  shelters: Shelter[];
  hospitals: Hospital[];
  warehouses: Warehouse[];
  roadClosures: { lat: number; lng: number }[];
}

interface Message {
  sender: 'ai' | 'user';
  text: string;
  reasoning?: string;
}

const SUGGESTED_QUERIES = [
  "Summarize today's emergency situation.",
  "Which shelters have available capacity?",
  "Where should I send another ambulance?",
  "What is the safest evacuation route?"
];

export default function AIChatAssistant({
  incidents,
  vehicles: _vehicles,
  shelters,
  hospitals,
  warehouses: _warehouses,
  roadClosures
}: AIChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Tactical Advisory AI online. Ask me to scan active incidents, compute route optimizations, locate available warehouse supplies, or evaluate hospital loads.",
      reasoning: "Initialization: Reading active simulation variables. Incident database loaded. Fleet coordinates synced. Route obstruction vectors calculated."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleQuery = (queryText: string) => {
    if (!queryText.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: 'user', text: queryText }]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let responseText = '';
      let reasoningText = '';

      const query = queryText.toLowerCase();

      if (query.includes('summarize') || query.includes('situation') || query.includes('today')) {
        const active = incidents.filter((i) => i.status !== 'Resolved');
        const pending = active.filter((i) => i.status === 'Pending').length;
        const dispatched = active.filter((i) => i.status === 'Dispatched').length;
        const ongoing = active.filter((i) => i.status === 'Active').length;
        
        reasoningText = `Telemetry Scan: Queried active incident list. Detected ${active.length} total active threat vectors. Pending: ${pending}, Dispatched: ${dispatched}, Ongoing: ${ongoing}. Calculating severity metrics.`;
        
        responseText = `Currently monitoring **${active.length} active emergency sites**:\n` +
          `- **${pending} Pending**: Awaiting resource assignment.\n` +
          `- **${dispatched} Dispatched**: Responders en route.\n` +
          `- **${ongoing} Ongoing Operations**: Search and rescue active.\n\n` +
          `**Top Priority**: Musi River Flooding (Severity 92) is our highest risk index due to overflows and trapped citizens. Suggest deploying NDRF Water Rescue units immediately.`;
      } 
      else if (query.includes('shelter') || query.includes('capacity')) {
        const availableShelters = shelters.map(s => {
          const spotsLeft = s.capacity - s.occupied;
          const pct = Math.round((s.occupied / s.capacity) * 100);
          return { name: s.name, spotsLeft, pct };
        });

        reasoningText = "Database Lookup: Querying shelter occupancy registry. Evaluating remaining capacity. Calculating percentage ratios.";
        
        responseText = "**Evacuation Shelter Status Matrix:**\n\n" +
          availableShelters.map(s => 
            `- **${s.name}**: ${s.spotsLeft} beds available (${s.pct}% occupied).`
          ).join('\n') + 
          `\n\n**Recommendation**: direct new evacuation vehicles to Gachibowli Indoor Stadium Camp since Nalgonda Government College Shelter is running at extreme capacity limits.`;
      } 
      else if (query.includes('ambulance') || query.includes('hospital') || query.includes('medical')) {
        const activeHospitals = hospitals.map(h => {
          const bedsLeft = h.totalBeds - h.occupiedBeds;
          return { name: h.name, bedsLeft };
        });

        reasoningText = "Optimization Algorithm: Mapping incident casualty estimates against hospital vacancy indices and ambulance dispatch status. Osmania Hospital showing high beds density.";

        responseText = `Ambulances are currently deploying to active building collapse incidents. General trauma capacity is as follows:\n` +
          activeHospitals.map(h => `- **${h.name}**: ${h.bedsLeft} empty beds remaining.`).join('\n') +
          `\n\n**Strategic Command**: Redirect incoming ambulance vectors to **Gandhi Medical College Hospital** since Osmania General Hospital is nearing overload (under 10% availability).`;
      } 
      else if (query.includes('route') || query.includes('closure') || query.includes('safe')) {
        reasoningText = `Graph Pathfinding: Querying active road closure coordinates. Active Closures: ${roadClosures.length}. Simulating alternate bypass vectors.`;
        
        responseText = `We have **${roadClosures.length} major road blocks** in play, notably the NH-65 highway block. The safest routes for emergency dispatch are:\n` +
          `- **North Corridor**: Open. Direct traffic via Outer Ring Road (ORR) bypass.\n` +
          `- **South Corridor**: Open. Clear of hazards. Safe for heavy NDRF supply trucks.\n\n` +
          `*AI Alert*: Avoid the Musi riverbed corridor entirely due to overflowing waters. Alternate route curves have been plotted on your map.`;
      } 
      else {
        reasoningText = "NLP Classifier fallback: Query is unstructured. Running keyword inference engine.";
        responseText = "Understood. Searching databases for context. Currently, the command center is in high alert. Please clarify if you need details on hospital beds, shelter vacancies, route paths, or vehicle dispatch recommendations.";
      }

      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: responseText, reasoning: reasoningText }
      ]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between glass-panel p-4 rounded-xl font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <div className="flex items-center space-x-1.5 text-cyan-400">
          <Bot className="w-4 h-4" />
          <span className="font-bold uppercase tracking-wider">Tactical AI Advisor</span>
        </div>
        <span className="text-[9px] text-slate-500">ACCELERATED PATHFINDING ACTIVE</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 max-h-[300px] md:max-h-[380px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-start space-x-2 max-w-[85%] p-3 rounded-lg ${
              msg.sender === 'user'
                ? 'bg-cyan-950/40 border border-cyan-800/30 text-white rounded-br-none'
                : 'bg-white/5 border border-white/5 text-slate-300 rounded-bl-none'
            }`}>
              {msg.sender === 'ai' ? (
                <Bot className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              ) : (
                <User className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="space-y-2 whitespace-pre-line text-[11px] leading-relaxed">
                {msg.text}
                
                {/* Reasoning Box */}
                {msg.reasoning && (
                  <div className="border-t border-white/5 pt-1.5 mt-1.5 text-[9px] text-slate-500 italic bg-black/10 px-2 py-1 rounded">
                    <span className="font-semibold not-italic text-cyan-500/80 block uppercase text-[8px] mb-0.5">AI Reasoning Steps:</span>
                    {msg.reasoning}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center space-x-2 text-slate-500">
            <Bot className="w-4 h-4 text-cyan-400 animate-bounce" />
            <span className="text-[10px] animate-pulse">THINKING / QUERYING GRID DATABASES...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input panel */}
      <div className="space-y-3">
        {/* Suggested Queries */}
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUERIES.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleQuery(q)}
              className="bg-zinc-900/80 hover:bg-cyan-950/40 border border-white/15 hover:border-cyan-500/50 text-[10px] text-zinc-200 hover:text-cyan-300 px-2 py-1 rounded transition text-left cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!inputText.trim()) return;
            handleQuery(inputText);
          }}
          className="flex space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Query tactical suggestions or shelter capacities..."
            className="flex-1 bg-cyber-dark border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
          />
          <button
            type="submit"
            className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold rounded-lg transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
