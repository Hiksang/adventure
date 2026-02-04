'use client';

import { useState } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: '💰',
      title: 'Watch & Earn',
      description: 'Get rewarded in WLD for watching ads. Real value for your attention.',
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      icon: '🛡️',
      title: 'Humans Only',
      description: 'World ID ensures 1 person = 1 account. No bots stealing your rewards.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: '🔒',
      title: 'Privacy First',
      description: 'Zero-knowledge proofs protect your identity. We never see your personal data.',
      gradient: 'from-blue-500 to-cyan-500',
    },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-4xl">📺</span>
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold text-white mb-2">AdWatch</h1>
        <p className="text-white/60 text-lg mb-12">Your attention has value</p>

        {/* Feature Slides */}
        <div className="w-full max-w-sm">
          <div className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-8">
            {/* Slide Content */}
            <div className="text-center">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${slides[currentSlide].gradient} flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                <span className="text-3xl">{slides[currentSlide].icon}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {slides[currentSlide].title}
              </h2>
              <p className="text-white/70 leading-relaxed">
                {slides[currentSlide].description}
              </p>
            </div>

            {/* Slide Indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? 'w-6 bg-white'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-8 mt-10">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">50+</p>
            <p className="text-white/50 text-sm">XP per ad</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">100%</p>
            <p className="text-white/50 text-sm">Human verified</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-white/50 text-sm">Data collected</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-10 pt-4">
        <button
          onClick={onGetStarted}
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
        >
          <span className="text-lg">Get Started</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>

        <p className="text-center text-white/40 text-xs mt-4">
          Powered by World ID
        </p>
      </div>
    </div>
  );
}
