import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Monitor } from 'lucide-react';

export default function Scene2Features() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex items-center justify-center px-4"
    >
      <div className="max-w-6xl w-full">
        <div className="space-y-8">
          {/* Anna taking a breath */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, times: [0, 0.5, 1] }}
              className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-500/30 mb-6"
            >
              <motion.div
                animate={{ 
                  opacity: [0.5, 1, 0.5],
                  scale: [0.8, 1, 0.8]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full"
              />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-cyan-300 text-lg italic"
            >
              *takes a deep breath*
            </motion.p>
          </motion.div>

          {/* Login sequence */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.8 }}
            className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-purple-500/20 shadow-2xl overflow-hidden max-w-2xl mx-auto"
          >
            {/* Browser bar */}
            <div className="bg-slate-800/50 px-4 py-3 border-b border-purple-500/10 flex items-center gap-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                transition={{ delay: 2.5, duration: 1 }}
                className="flex-1 bg-slate-700/50 rounded-lg px-4 py-1.5 text-white font-mono text-sm"
              >
                sprintly.app
              </motion.div>
            </div>

            {/* Login page */}
            <div className="p-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 3.5, duration: 0.6 }}
                className="text-center space-y-6"
              >
                <div className="flex items-center justify-center gap-3 mb-8">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Sprintly
                  </h1>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 4, duration: 0.5 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-800/50 rounded-lg px-4 py-3 text-left">
                    <span className="text-slate-400 text-sm">Email</span>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg px-4 py-3 text-left">
                    <span className="text-slate-400 text-sm">Password</span>
                  </div>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 4.5 }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg px-4 py-3 font-semibold"
                  >
                    Sign In
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* Dashboard preview emerging */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 5.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl border border-purple-500/30 shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 px-6 py-4 border-b border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-6 h-6 text-purple-400" />
                  <span className="text-white font-semibold text-xl">Dashboard</span>
                </div>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-green-400 text-sm font-medium"
                >
                  ● Live
                </motion.div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Active Projects', value: '8', color: 'blue' },
                { label: 'Team Capacity', value: '92%', color: 'green' },
                { label: 'On Track', value: '7/8', color: 'purple' }
              ].map((metric, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 6.5 + i * 0.2 }}
                  className={`bg-gradient-to-br from-${metric.color}-500/10 to-${metric.color}-600/10 border border-${metric.color}-500/30 rounded-2xl p-6`}
                >
                  <p className="text-slate-400 text-sm mb-2">{metric.label}</p>
                  <p className="text-white text-4xl font-bold">{metric.value}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Voiceover text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 8, duration: 0.8 }}
            className="text-center"
          >
            <p className="text-slate-300 text-2xl font-light">
              It's time for a <span className="text-purple-400 font-semibold">new way to plan</span>.
            </p>
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 9, duration: 0.6 }}
              className="text-white text-3xl font-bold mt-4"
            >
              Meet Sprintly.
            </motion.p>
          </motion.div>

          {/* Subtle text at bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 10, duration: 1 }}
            className="text-center"
          >
            <p className="text-purple-300/60 text-lg italic">Clarity starts here.</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
