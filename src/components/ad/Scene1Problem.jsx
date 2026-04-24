import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, MessageSquare, Calendar, FileSpreadsheet, Users } from 'lucide-react';

export default function Scene1Problem() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex items-center justify-center px-4"
    >
      <div className="max-w-7xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Anna stressed */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20">
              {/* Chaotic desk representation */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center">
                    <Users className="w-10 h-10 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-xl">Anna</h3>
                    <p className="text-slate-400">Project Manager</p>
                  </div>
                </div>
                
                {/* Stress indicators */}
                <motion.div
                  animate={{ 
                    boxShadow: [
                      '0 0 20px rgba(239, 68, 68, 0.3)',
                      '0 0 40px rgba(239, 68, 68, 0.5)',
                      '0 0 20px rgba(239, 68, 68, 0.3)',
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
                >
                  <p className="text-red-300 text-sm italic">
                    "This is impossible... I can't keep track of everything..."
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Right side - Chaos visuals */}
          <div className="space-y-4">
            {/* Nightmare spreadsheet */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-red-500/20 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 px-4 py-2 border-b border-red-500/20 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-red-400" />
                <span className="text-red-300 text-sm font-medium">project_plan_final_v3_FINAL.xlsx</span>
              </div>
              <div className="p-4 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex gap-2"
                  >
                    {[...Array(8)].map((_, j) => (
                      <div
                        key={j}
                        className="h-6 flex-1 bg-slate-700/50 rounded"
                        style={{
                          backgroundColor: Math.random() > 0.7 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(71, 85, 105, 0.5)'
                        }}
                      />
                    ))}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Chaotic notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-orange-500/20 p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Messages overload</span>
              </div>
              {[
                '@here Where is the status update?',
                '@channel URGENT: Client meeting moved up!',
                '@anna Can you check resource allocation?'
              ].map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.2 }}
                  className="bg-orange-500/10 rounded-lg px-3 py-2 text-orange-200 text-xs"
                >
                  {msg}
                </motion.div>
              ))}
            </motion.div>

            {/* Problem overlays */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { text: 'OVER-ALLOCATED?', color: 'red', delay: 2 },
                { text: 'MISSED DEADLINES?', color: 'orange', delay: 2.3 },
                { text: 'CONFUSED TEAM?', color: 'yellow', delay: 2.6 }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ 
                    opacity: { delay: item.delay },
                    scale: { delay: item.delay + 0.2, duration: 0.8, repeat: Infinity }
                  }}
                  className={`bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 rounded-xl p-3 text-center`}
                >
                  <p className="text-white font-bold text-xs leading-tight">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Voiceover text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-slate-300 text-2xl font-light max-w-3xl mx-auto leading-relaxed">
            Is your project plan a house of cards?<br/>
            <span className="text-red-300 font-medium">Juggling spreadsheets, resources, and deadlines</span> feels like a battle you can't win.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
