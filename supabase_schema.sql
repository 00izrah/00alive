-- ==============================================================================
-- 00ALIVE DATABASE SCHEMA & REALTIME SETUP
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Spotify Snapshot Table (stores live playback, audio features, clock)
CREATE TABLE IF NOT EXISTS public.spotify_snapshot (
    id BIGINT PRIMARY KEY DEFAULT 1,
    track JSONB NOT NULL DEFAULT '{}'::jsonb,
    audio_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    recent_tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_artists JSONB NOT NULL DEFAULT '[]'::jsonb,
    listening_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Recommendations Inbox (stores community song drops)
CREATE TABLE IF NOT EXISTS public.recommendations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    message TEXT DEFAULT '',
    track JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Pings Table (stores check-in pings)
CREATE TABLE IF NOT EXISTS public.pings (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    message TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Public Read/Write Policies
ALTER TABLE public.spotify_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to spotify_snapshot"
ON public.spotify_snapshot FOR SELECT USING (true);

CREATE POLICY "Allow service role write access to spotify_snapshot"
ON public.spotify_snapshot FOR ALL USING (true);

CREATE POLICY "Allow public read access to recommendations"
ON public.recommendations FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to recommendations"
ON public.recommendations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert access to pings"
ON public.pings FOR INSERT WITH CHECK (true);

-- 5. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.spotify_snapshot;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recommendations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pings;
