"use client";

interface SwipeCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  onLike: () => void;
  onDislike: () => void;
}

export default function SwipeCard({ title, subtitle, badge, onLike, onDislike }: SwipeCardProps) {
  return (
    <div className="card-enter bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col gap-4 max-w-sm w-full">
      {badge && (
        <span className="self-start text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div>
        <p className="text-base font-semibold">{title}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-3 mt-2">
        <button
          onClick={onDislike}
          className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 hover:border-red-300 hover:text-red-500 transition-colors"
        >
          ✕ Skip
        </button>
        <button
          onClick={onLike}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 transition-colors"
        >
          ✓ Yes
        </button>
      </div>
    </div>
  );
}
