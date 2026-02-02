'use client';
import { useState } from 'react';
import Button from '../ui/Button';

interface CodeInputProps {
  activityId: string;
  onSuccess: (xp: number) => void;
}

export default function CodeInput({ activityId, onSuccess }: CodeInputProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/activities/submit-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, code: code.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        onSuccess(data.xp_earned);
      } else {
        setError(data.message || 'Invalid code. Try again.');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter your code here"
        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        autoComplete="off"
      />
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <Button onClick={handleSubmit} loading={loading} size="lg" className="w-full">
        Submit Code
      </Button>
    </div>
  );
}
