export function getWATHour(date = new Date()) {
    return parseInt(
        new Intl.DateTimeFormat("en-GB", {
            hour: "numeric",
            hourCycle: "h23",
            timeZone: "Africa/Lagos",
        }).format(date),
        10,
    );
}

export function getTimeContext(hour) {
    if (hour >= 0 && hour < 5) return "it's past midnight (devil's hours)";
    if (hour < 12) return "it's morning";
    if (hour < 17) return "it's the afternoon";
    if (hour < 21) return "it's evening";
    return "it's late at night";
}

export function getTimeSlot(hour) {
    if (hour < 6) return "late-night";
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
}

export function generateVibe(energy, valence, playedAt) {
    const hour = playedAt ? getWATHour(new Date(playedAt)) : getWATHour();
    let timePhrase;
    if (hour >= 5 && hour < 12) timePhrase = "morning";
    else if (hour >= 12 && hour < 17) timePhrase = "mid-day";
    else if (hour >= 17 && hour < 21) timePhrase = "evening";
    else timePhrase = "late night";


    if (energy > 0.7 && valence > 0.6) return `high-energy ${timePhrase}`;
    if (energy > 0.7 && valence <= 0.6) return `intense ${timePhrase} session`;
    if (energy <= 0.4 && valence <= 0.4) return `${timePhrase} melancholy`;
    if (energy <= 0.5 && valence > 0.5) return `breezy ${timePhrase}`;
    if (energy > 0.5 && valence < 0.3) return `grind mode ${timePhrase}`;
    return `steady ${timePhrase} flow`;
}

export function calculateTier(playedAt, isPlaying) {
    if (isPlaying) {
        return {
            tier: "LIVE",
            label: "actively not dead",
            color: "alive",
            message: "literally on the aux rn",
        };
    }

    if (!playedAt) {
        return {
            tier: "UNKNOWN",
            label: "unknown",
            color: "warn",
            message: "no recent activity recorded.",
        };
    }

    const minutesAgo = (Date.now() - new Date(playedAt).getTime()) / (1000 * 60);

    if (minutesAgo < 120) {
        return { tier: "ALIVE", label: "alive", color: "alive", message: null };
    }
    if (minutesAgo < 480) {
        return {
            tier: "QUIET",
            label: "quiet",
            color: "alive",
            message: "around, just off the aux for a bit.",
        };
    }
    if (minutesAgo < 900) {
        return {
            tier: "STILL HERE",
            label: "still here",
            color: "warn",
            message: "no music today. suspicious, but not alarming.",
        };
    }
    if (minutesAgo < 1440) {
        return {
            tier: "UNKNOWN",
            label: "unknown",
            color: "warn",
            message: "going on 15+ hours with no music. someone check on him.",
        };
    }
    return {
        tier: "CHECK ON HIM",
        label: "missing",
        color: "dead",
        message: "this is not normal. he always has something playing.",
    };
}
