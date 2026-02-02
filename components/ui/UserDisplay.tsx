interface UserDisplayProps {
  username: string;
  level?: number;
  xp?: number;
}

export default function UserDisplay({ username, level, xp }: UserDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
        {username.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="font-semibold text-sm">{username}</p>
        {level !== undefined && (
          <p className="text-xs text-gray-500">Lv.{level}{xp !== undefined ? ` · ${xp} XP` : ''}</p>
        )}
      </div>
    </div>
  );
}
