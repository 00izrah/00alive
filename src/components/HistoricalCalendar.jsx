import { useMemo } from 'react';

export function HistoricalCalendar({ calendar = [], isLoading = false }) {
  const days = useMemo(() => {
    const map = new Map();
    if (Array.isArray(calendar)) {
      calendar.forEach(item => {
        if (item?.date) {
          map.set(item.date, item.count ?? 0);
        }
      });
    }

    const result = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = map.get(dateStr) ?? 0;

      let level = 0;
      if (count >= 20) level = 4;
      else if (count >= 10) level = 3;
      else if (count >= 3) level = 2;
      else if (count > 0) level = 1;

      result.push({
        date: dateStr,
        day: d.getDate(),
        count,
        level,
      });
    }
    return result;
  }, [calendar]);

  if (isLoading) {
    return (
      <div className="bg-surface/30 border border-border/50 rounded-xl p-6 h-32 animate-pulse mb-8" />
    );
  }

  const getColor = (level) => {
    switch(level) {
      case 4: return 'bg-alive shadow-[0_0_8px_rgba(200,255,0,0.5)]';
      case 3: return 'bg-alive/80';
      case 2: return 'bg-alive/60';
      case 1: return 'bg-alive/30';
      default: return 'bg-surface/50 border border-border/50';
    }
  };

  return (
    <div className="bg-surface/30 border border-border/50 rounded-xl p-6 mb-8 relative overflow-hidden group hover:border-alive/30 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono font-bold text-text uppercase tracking-widest flex items-center gap-2">
          <svg className="w-4 h-4 text-text/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Month Grid
        </h3>
        <span className="text-[10px] font-mono text-muted uppercase tracking-widest">
          Last 30 Days
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-start">
        {days.map((day, i) => (
          <div 
            key={i} 
            className={`w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] rounded ${getColor(day.level)} transition-colors duration-300 hover:ring-1 hover:ring-text/50 relative group/block`}
          >
            {/* Tooltip */}
            <div className="absolute opacity-0 group-hover/block:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 border border-white/10 text-[10px] text-white px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10 transition-opacity">
              {day.date}: {day.count} track{day.count === 1 ? '' : 's'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
