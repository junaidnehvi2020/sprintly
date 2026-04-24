
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, LayoutDashboard, LogIn } from 'lucide-react';
import Scene1Problem from '@/components/ad/Scene1Problem';
import Scene2Features from '@/components/ad/Scene2Features';
import Scene3CTA from '@/components/ad/Scene3CTA';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';


export default function AdExperience() {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const backUrl = from === 'login' ? '/login' : '/dashboard';
  const backText = from === 'login' ? 'Back to Login' : 'Back to Dashboard';
  const BackIcon = from === 'login' ? LogIn : LayoutDashboard;


  const SCENE_DURATIONS = [10000, 15000, 25000, 10000]; // 60 seconds total
  const TOTAL_DURATION = SCENE_DURATIONS.reduce((a, b) => a + b, 0);

  useEffect(() => {
    let animationFrame;
    if (isPlaying) {
      let startTime = Date.now();
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
        setProgress(newProgress);

        let accumulatedTime = 0;
        for (let i = 0; i < SCENE_DURATIONS.length; i++) {
          accumulatedTime += SCENE_DURATIONS[i];
          if (elapsed < accumulatedTime) {
            if (currentScene !== i) setCurrentScene(i);
            break;
          }
        }

        if (elapsed >= TOTAL_DURATION) {
          setIsPlaying(false);
          setProgress(100);
          setCurrentScene(3);
        } else {
          animationFrame = requestAnimationFrame(updateProgress);
        }
      };

      animationFrame = requestAnimationFrame(updateProgress);
    }
    
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying]);

  const startExperience = () => {
    setCurrentScene(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const replay = () => {
    startExperience();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {isPlaying && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 origin-left z-50"
          style={{ width: '100%' }}
        />
      )}

      {currentScene >= 1 && isPlaying && (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute top-6 right-6 z-50">
             <Button
              asChild
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-800/50"
            >
              <Link href={backUrl}>
                <BackIcon className="w-4 h-4 mr-2" />
                {backText}
              </Link>
            </Button>
        </motion.div>
      )}

      <div className="relative h-full flex items-center justify-center">
        {!isPlaying && currentScene === 0 && progress === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-7xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-4">
                Sprintly
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                From chaos to clarity. Experience the transformation in 60 seconds.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={startExperience}
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-full shadow-2xl shadow-purple-500/50 transition-all duration-300 hover:scale-105"
              >
                <Play className="w-6 h-6 mr-2" />
                Watch Experience
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {currentScene === 0 && isPlaying && <Scene1Problem key="scene1" />}
            {currentScene === 1 && isPlaying && <Scene2Features key="scene2" />}
            {currentScene === 2 && isPlaying && <Scene3CTA key="scene3" />}
            {(currentScene === 3 || progress === 100) && (
              <motion.div
                key="scene4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex items-center justify-center px-4"
              >
                <div className="text-center space-y-12 max-w-4xl">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <motion.div
                      animate={{ 
                        boxShadow: [
                          '0 0 40px rgba(168, 85, 247, 0.4)',
                          '0 0 80px rgba(168, 85, 247, 0.6)',
                          '0 0 40px rgba(168, 85, 247, 0.4)',
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-block bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-12 py-8 rounded-3xl"
                    >
                      <h1 className="text-7xl font-bold text-white">Sprintly</h1>
                    </motion.div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.6 }}
                  >
                    <h2 className="text-4xl font-bold text-white mb-6">
                      Plan, Track, and Deliver. Perfectly.
                    </h2>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.6 }}
                  >
                    <p className="text-2xl text-purple-300 font-semibold">
                      Share your thoughts and collaborate.
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {!isPlaying && progress >= 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex items-center gap-4"
          >
            <Button
              onClick={replay}
              size="lg"
              variant="outline"
              className="bg-slate-900/50 backdrop-blur-xl border-purple-500/50 text-white px-8 py-6 text-lg rounded-full hover:bg-slate-800/50 transition-all duration-300 hover:scale-105"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Replay Experience
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-slate-900/50 backdrop-blur-xl border-emerald-500/50 text-white px-8 py-6 text-lg rounded-full hover:bg-slate-800/50 transition-all duration-300 hover:scale-105"
            >
              <Link href={backUrl}>
                <BackIcon className="w-5 h-5 mr-2" />
                {backText}
              </Link>
            </Button>
          </motion.div>
        )}
      </div>

      {isPlaying && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                index === currentScene
                  ? 'bg-purple-400 w-8'
                  : index < currentScene
                  ? 'bg-purple-600'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
