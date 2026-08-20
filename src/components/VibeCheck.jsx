import { useState, useEffect } from 'react';

export function VibeCheck() {
    const [votes, setVotes] = useState({ fire: 0, flag: 0 });
    const [hasVoted, setHasVoted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch the global tally on load (independent of any track)
        fetch('/api/vibes')
            .then(res => res.json())
            .then(data => {
                setVotes({ 
                    fire: data.fire_votes || 0, 
                    flag: data.flag_votes || 0
                });
                // Optional: Check local storage to see if they voted in a previous session
                // if (localStorage.getItem('izrah_voted')) {
                //     setHasVoted(true);
                // }
                setLoading(false);
            });
    }, []);

    const handleVote = async (type) => {
        if (hasVoted) return;
        
        setHasVoted(true);
        // localStorage.setItem('izrah_voted', 'true'); // Prevent double voting on refresh
        
        // Optimistic update
        setVotes(prev => ({ ...prev, [type]: prev[type] + 1 }));

        await fetch('/api/vibes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voteType: type })
        });
    };

    if (loading) return <div className="h-full animate-pulse bg-surface/30 border border-border rounded-2xl" />;

    const total = votes.fire + votes.flag;
    const firePct = total === 0 ? 50 : Math.round((votes.fire / total) * 100);
    const flagPct = total === 0 ? 50 : Math.round((votes.flag / total) * 100);

    return (
        <div className="border border-border rounded-2xl p-4 h-full flex flex-col justify-center">
            {!hasVoted ? (
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleVote('fire')} 
                        className="flex-1 bg-alive/10 hover:bg-alive/20 text-alive border border-alive/30 rounded-xl py-4 text-2xl transition-colors active:scale-95"
                    >
                        🔥
                    </button>
                    <button 
                        onClick={() => handleVote('flag')} 
                        className="flex-1 bg-dead/10 hover:bg-dead/20 text-dead border border-dead/30 rounded-xl py-4 text-2xl transition-colors active:scale-95"
                    >
                        🚩
                    </button>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in duration-500 py-2">
                    <div className="flex justify-between text-xs font-mono font-bold tracking-widest">
                        <span className="text-alive">{firePct}% 🔥</span>
                        <span className="text-dead">🚩 {flagPct}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-surface">
                        <div 
                            className="h-full bg-alive transition-all duration-1000" 
                            style={{ width: `${firePct}%` }} 
                        />
                        <div 
                            className="h-full bg-dead transition-all duration-1000" 
                            style={{ width: `${flagPct}%` }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}