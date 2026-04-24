import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Brain, BarChart3, Users, Zap, TrendingUp, Sparkles } from 'lucide-react';

export default function Scene3CTA() {
  const [activeDemo, setActiveDemo] = useState(0);

  useEffect(() => {
    const intervals = [0, 6000, 12000, 18000];
    const timer = setTimeout(() => {
      if (activeDemo < 3) {
        setActiveDemo(activeDemo + 1);
      }
    }, intervals[activeDemo + 1] - intervals[activeDemo]);

    return () => clearTimeout(timer);
  }, [activeDemo]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex items-center justify-center px-4"
    >
      <div className="max-w-7xl w-full">
        <AnimatePresence mode="wait">
          {/* Demo 1: Dashboard Visualization */}
          {activeDemo === 0 && (
            <motion.div
              key="demo1"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-blue-500/20 shadow-2xl overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 px-6 py-4 border-b border-blue-500/10">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-blue-400" />
                    <h3 className="text-white font-semibold text-xl">Project Dashboard</h3>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {[
                      { label: 'Tasks In Progress', value: '24', icon: CheckCircle },
                      { label: 'Team Members', value: '12', icon: Users },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.2 }}
                        className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <item.icon className="w-5 h-5 text-blue-400" />
                          <span className="text-slate-400 text-sm">{item.label}</span>
                        </div>
                        <p className="text-white text-4xl font-bold">{item.value}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Resource Utilization Chart */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50"
                  >
                    <h4 className="text-white font-semibold mb-4">Resource Utilization</h4>
                    <div className="space-y-4">
                      {[
                        { name: 'Frontend', initial: 145, final: 95 },
                        { name: 'Backend', initial: 120, final: 85 },
                        { name: 'Design', initial: 80, final: 90 },
                      ].map((team, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">{team.name}</span>
                            <motion.span
                              initial={{ opacity: 1 }}
                              animate={{ opacity: team.initial > 100 ? 0 : 1 }}
                              transition={{ delay: 2 + i * 0.2 }}
                              className="text-white font-medium"
                            >
                              {team.initial}%
                            </motion.span>
                          </div>
                          <div className="relative w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: `${team.initial}%` }}
                              animate={{ width: `${team.final}%` }}
                              transition={{ duration: 1, delay: 2 + i * 0.2, ease: 'easeInOut' }}
                              className={`absolute inset-y-0 left-0 rounded-full ${
                                team.initial > 100 
                                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                  : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5 }}
                className="text-center text-slate-300 text-xl"
              >
                Visualize your entire project <span className="text-blue-400 font-semibold">instantly</span>.
              </motion.p>
            </motion.div>
          )}

          {/* Demo 2: Squad Planning */}
          {activeDemo === 1 && (
            <motion.div
              key="demo2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <motion.div
                className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-purple-500/20 shadow-2xl overflow-hidden"
              >
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 px-6 py-4 border-b border-purple-500/10">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-purple-400" />
                    <h3 className="text-white font-semibold text-xl">Squad Planning</h3>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Squad 1 */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white font-semibold">Product Team</span>
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 2, type: 'spring' }}
                          className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 px-3 py-1 rounded-full text-sm font-bold"
                        >
                          <Zap className="w-3 h-3" />
                          100% Allocated
                        </motion.div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                            className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full border-2 border-slate-700"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Squad 2 */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white font-semibold">Engineering Team</span>
                        <span className="text-slate-400 text-sm">75% capacity</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full border-2 border-slate-700"
                          />
                        ))}
                        <motion.div
                          initial={{ opacity: 0, scale: 0, rotate: -180 }}
                          animate={{ opacity: 0.3, scale: 1, rotate: 0 }}
                          transition={{ delay: 2.5, type: 'spring' }}
                          className="w-12 h-12 border-2 border-dashed border-slate-600 rounded-full flex items-center justify-center"
                        >
                          <span className="text-slate-500 text-xl">+</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
                className="text-center text-slate-300 text-xl"
              >
                Plan your team's capacity with <span className="text-purple-400 font-semibold">precision</span>. No more guesswork.
              </motion.p>
            </motion.div>
          )}

          {/* Demo 3: Task Management */}
          {activeDemo === 2 && (
            <motion.div
              key="demo3"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <motion.div
                className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-emerald-500/20 shadow-2xl overflow-hidden"
              >
                <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 px-6 py-4 border-b border-emerald-500/10">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-white font-semibold text-xl">Task Management</h3>
                  </div>
                </div>
                
                <div className="p-8 space-y-4">
                  {[
                    { name: 'API Development', assigned: 'Sarah', days: 5, remaining: 15 },
                    { name: 'UI Components', assigned: 'Mike', days: 3, remaining: 12 },
                    { name: 'Testing Suite', assigned: 'Lisa', days: 4, remaining: 16 },
                  ].map((task, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.3 }}
                      className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-white font-semibold mb-1">{task.name}</h4>
                          <p className="text-slate-400 text-sm">Assigned to: {task.assigned}</p>
                        </div>
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1 + i * 0.3, type: 'spring' }}
                          className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {task.days} days
                        </motion.div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400">Remaining capacity:</span>
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.5 + i * 0.3 }}
                          className="text-white font-semibold"
                        >
                          {task.remaining - task.days} → {task.remaining} days
                        </motion.span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
                className="text-center text-slate-300 text-xl"
              >
                Define tasks and assign resources with <span className="text-emerald-400 font-semibold">confidence</span>.
              </motion.p>
            </motion.div>
          )}

          {/* Demo 4: AI Time Adjuster */}
          {activeDemo === 3 && (
            <motion.div
              key="demo4"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <motion.div
                className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-pink-500/20 shadow-2xl overflow-hidden max-w-3xl mx-auto"
              >
                <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 px-6 py-4 border-b border-pink-500/10">
                  <div className="flex items-center gap-3">
                    <Brain className="w-6 h-6 text-pink-400" />
                    <h3 className="text-white font-semibold text-xl">AI-Powered Estimates</h3>
                  </div>
                </div>
                
                <div className="p-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 space-y-6"
                  >
                    <div>
                      <h4 className="text-white font-semibold text-lg mb-2">E-commerce Platform Redesign</h4>
                      <p className="text-slate-400 text-sm">Sprint 3 • High Priority</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                        <span className="text-slate-300">Manual Estimate</span>
                        <motion.span
                          initial={{ opacity: 1 }}
                          animate={{ opacity: 0.4, scale: 0.95 }}
                          transition={{ delay: 2 }}
                          className="text-white font-bold text-xl line-through decoration-slate-500"
                        >
                          8 days
                        </motion.span>
                      </div>

                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, type: 'spring' }}
                        className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg px-6 py-3 font-semibold flex items-center justify-center gap-2"
                      >
                        <Brain className="w-5 h-5" />
                        Analyze with AI
                      </motion.button>

                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 2.5, type: 'spring' }}
                        className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-lg p-6"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                              <Sparkles className="w-5 h-5 text-pink-400" />
                            </motion.div>
                            <span className="text-pink-300 font-medium">AI-Optimized Estimate</span>
                          </div>
                          <motion.span
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ delay: 3, duration: 0.5 }}
                            className="text-white font-bold text-3xl"
                          >
                            6.5 days
                          </motion.span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-slate-300">
                          <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <p>Based on team velocity, similar tasks, and historical data</p>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4 }}
                className="text-center text-slate-300 text-xl"
              >
                Leverage <span className="text-pink-400 font-semibold">AI</span> for smarter, more realistic time estimates.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
