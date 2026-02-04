'use client';

interface VerificationBadgeProps {
  verificationLevel: 'orb' | 'device' | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const BADGE_STYLES = {
  orb: {
    gradient: 'from-green-400 to-emerald-500',
    shadow: 'shadow-green-500/30',
    icon: '🟢',
    label: 'Orb Verified',
    description: 'Highest verification level',
  },
  device: {
    gradient: 'from-blue-400 to-cyan-500',
    shadow: 'shadow-blue-500/30',
    icon: '🔵',
    label: 'Device Verified',
    description: 'Standard verification',
  },
  null: {
    gradient: 'from-gray-400 to-gray-500',
    shadow: 'shadow-gray-500/30',
    icon: '⚪',
    label: 'Not Verified',
    description: 'Verification required',
  },
};

const SIZE_STYLES = {
  sm: {
    badge: 'w-5 h-5',
    icon: 'text-xs',
    label: 'text-xs',
  },
  md: {
    badge: 'w-8 h-8',
    icon: 'text-sm',
    label: 'text-sm',
  },
  lg: {
    badge: 'w-12 h-12',
    icon: 'text-lg',
    label: 'text-base',
  },
};

export default function VerificationBadge({
  verificationLevel,
  size = 'md',
  showLabel = false,
}: VerificationBadgeProps) {
  const level = verificationLevel || 'null';
  const styles = BADGE_STYLES[level as keyof typeof BADGE_STYLES];
  const sizeStyles = SIZE_STYLES[size];

  return (
    <div className="flex items-center gap-2">
      {/* Badge icon */}
      <div
        className={`${sizeStyles.badge} rounded-full bg-gradient-to-br ${styles.gradient} ${styles.shadow} shadow-lg flex items-center justify-center`}
        title={styles.description}
      >
        {verificationLevel === 'orb' ? (
          <svg
            className={`${sizeStyles.icon} text-white`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : verificationLevel === 'device' ? (
          <svg
            className={`${sizeStyles.icon} text-white`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        ) : (
          <svg
            className={`${sizeStyles.icon} text-white`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <div className="flex flex-col">
          <span className={`${sizeStyles.label} font-semibold text-white`}>
            {styles.label}
          </span>
          <span className="text-xs text-white/50">{styles.description}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Inline verification badge for use in text
 */
export function VerificationBadgeInline({
  verificationLevel,
}: {
  verificationLevel: 'orb' | 'device' | null;
}) {
  const level = verificationLevel || 'null';
  const styles = BADGE_STYLES[level as keyof typeof BADGE_STYLES];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${styles.gradient} text-white`}
      title={styles.description}
    >
      {verificationLevel === 'orb' ? (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Orb
        </>
      ) : verificationLevel === 'device' ? (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Device
        </>
      ) : (
        'Unverified'
      )}
    </span>
  );
}

/**
 * Reward eligibility indicator based on verification level
 */
export function RewardEligibility({
  verificationLevel,
}: {
  verificationLevel: 'orb' | 'device' | null;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Reward Eligibility
      </h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-white/70">Ad Rewards</span>
          <span className={verificationLevel ? 'text-green-400' : 'text-red-400'}>
            {verificationLevel ? '✓ Eligible' : '✗ Verify first'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/70">Quiz Rewards</span>
          <span className={verificationLevel ? 'text-green-400' : 'text-red-400'}>
            {verificationLevel ? '✓ Eligible' : '✗ Verify first'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/70">Bonus Multiplier</span>
          <span className={verificationLevel === 'orb' ? 'text-green-400' : 'text-yellow-400'}>
            {verificationLevel === 'orb' ? '2x (Orb)' : verificationLevel === 'device' ? '1x (Device)' : '0x'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/70">WLD Withdrawal</span>
          <span className={verificationLevel === 'orb' ? 'text-green-400' : 'text-yellow-400'}>
            {verificationLevel === 'orb' ? '✓ Full access' : verificationLevel === 'device' ? '⚠ Limited' : '✗ Verify first'}
          </span>
        </div>
      </div>
    </div>
  );
}
