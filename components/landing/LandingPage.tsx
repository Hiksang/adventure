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
    <div className="flex-1 bg-black flex flex-col justify-between px-6 py-4">
      {/* Hero Section - centered content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Logo */}
        <div className="mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-xl">📺</span>
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-xl font-bold text-white mb-0.5">AdWatch</h1>
        <p className="text-white/60 text-xs mb-4">Your attention has value</p>

        {/* Feature Slides */}
        <div className="w-full max-w-xs">
          <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
            <div className="text-center">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${slides[currentSlide].gradient} flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                <span className="text-lg">{slides[currentSlide].icon}</span>
              </div>
              <h2 className="text-base font-bold text-white mb-1">
                {slides[currentSlide].title}
              </h2>
              <p className="text-white/70 text-[11px] leading-relaxed">
                {slides[currentSlide].description}
              </p>
            </div>

            <div className="flex justify-center gap-2 mt-3">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentSlide
                      ? 'w-4 bg-white'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="text-center">
            <p className="text-base font-bold text-white">50+</p>
            <p className="text-white/50 text-[9px]">XP per ad</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <p className="text-base font-bold text-white">100%</p>
            <p className="text-white/50 text-[9px]">Human verified</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <p className="text-base font-bold text-white">0</p>
            <p className="text-white/50 text-[9px]">Data collected</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="pt-3">
        <button
          onClick={onGetStarted}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <span className="text-sm">Get Started</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
        <p className="text-center text-white/40 text-[9px] mt-1.5">
          Powered by World ID
        </p>
      </div>
    </div>
  );
}
