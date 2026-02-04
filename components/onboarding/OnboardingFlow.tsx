'use client';
import { useState, ReactNode } from 'react';

type OnboardingStep = 'welcome' | 'why-worldid' | 'verify';

interface OnboardingFlowProps {
  onComplete: () => void;
  children?: ReactNode;
}

interface StepContent {
  title: string;
  description: string;
  icon: ReactNode;
  features?: { icon: string; text: string }[];
}

const STEPS: Record<OnboardingStep, StepContent> = {
  welcome: {
    title: 'Welcome to AdWatch',
    description: 'The first watch-to-earn platform where only verified humans can participate.',
    icon: (
      <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
      </svg>
    ),
    features: [
      { icon: '💰', text: 'Earn XP and WLD for watching ads' },
      { icon: '🤖', text: 'No bots - only verified humans' },
      { icon: '🔒', text: 'Your privacy is protected' },
    ],
  },
  'why-worldid': {
    title: 'Why World ID?',
    description: 'World ID ensures fairness and prevents fraud in our reward system.',
    icon: (
      <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    features: [
      { icon: '👤', text: '1 person = 1 account (no multi-accounts)' },
      { icon: '🛡️', text: 'Zero-knowledge proof protects your identity' },
      { icon: '✅', text: 'Advertisers trust verified human views' },
    ],
  },
  verify: {
    title: 'Ready to Start',
    description: 'Complete a quick verification to start earning rewards.',
    icon: (
      <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    features: [
      { icon: '⚡', text: 'Takes less than 30 seconds' },
      { icon: '🎁', text: 'Get 50 XP bonus for signing up' },
      { icon: '🏆', text: 'Join the leaderboard' },
    ],
  },
};

const STEP_ORDER: OnboardingStep[] = ['welcome', 'why-worldid', 'verify'];

export default function OnboardingFlow({ onComplete, children }: OnboardingFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentStep = STEP_ORDER[currentStepIndex];
  const stepContent = STEPS[currentStep];
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      setCompleted(true);
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setCompleted(true);
    onComplete();
  };

  if (completed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex flex-col pb-24 overflow-y-auto overscroll-none">
      {/* Skip button */}
      <div className="flex justify-end p-3">
        <button
          onClick={handleSkip}
          className="text-white/50 hover:text-white/80 text-xs px-3 py-1.5 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-2">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10">
          {stepContent.icon}
        </div>

        {/* Text */}
        <h1 className="text-xl font-bold text-white text-center mb-2">
          {stepContent.title}
        </h1>
        <p className="text-white/70 text-center max-w-xs mb-4 text-xs">
          {stepContent.description}
        </p>

        {/* Features */}
        {stepContent.features && (
          <div className="w-full max-w-xs space-y-2 mb-4">
            {stepContent.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 backdrop-blur-sm border border-white/10"
              >
                <span className="text-lg">{feature.icon}</span>
                <span className="text-white/80 text-xs">{feature.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 space-y-3">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-2">
          {STEP_ORDER.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStepIndex
                  ? 'w-5 bg-purple-500'
                  : index < currentStepIndex
                  ? 'bg-purple-500/50'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {currentStepIndex > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-2.5 px-4 bg-white/10 text-white font-semibold rounded-2xl border border-white/20 text-sm"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/30 text-sm"
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
