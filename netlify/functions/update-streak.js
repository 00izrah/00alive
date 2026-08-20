import { schedule } from "@netlify/functions";
import { getSupabaseClient } from "./utils/supabase.js";
import { getSpotifyAccessToken, getActivityToday } from "./utils/spotify.js";

const updateStreakHandler = async () => {
	const supabase = getSupabaseClient();
	if (!supabase) {
		console.error("Missing Supabase credentials in update-streak");
		return { statusCode: 500 };
	}

	try {
		const token = await getSpotifyAccessToken();
		const { active, trackCount } = await getActivityToday(token);

		// Align with status.js: query 'streaks' first, fallback to 'streak' if needed
		let streakTable = "streaks";
		let { data: current, error: fetchErr } = await supabase
			.from("streaks")
			.select("*")
			.eq("id", 1)
			.maybeSingle();

		if (fetchErr || !current) {
			const fallback = await supabase
				.from("streak")
				.select("*")
				.eq("id", 1)
				.maybeSingle();
			if (fallback.data) {
				current = fallback.data;
				streakTable = "streak";
			}
		}

		const streakRecord = current || {
			current_streak: 0,
			best_streak: 0,
			total_days: 0,
			last_active_date: null,
		};

		const today = new Date().toISOString().split("T")[0];

		if (active) {
			const newStreak = (streakRecord.current_streak || 0) + 1;
			const newBest = Math.max(newStreak, streakRecord.best_streak || 0);
			const newTotal = (streakRecord.total_days || 0) + 1;

			const updatePayload = {
				id: 1,
				current_streak: newStreak,
				best_streak: newBest,
				last_active_date: today,
				total_days: newTotal,
			};

			await supabase.from(streakTable).upsert(updatePayload);
			if (streakTable === "streaks") {
				await supabase.from("streak").upsert(updatePayload).catch(() => {});
			}

			// Insert/Update listening_calendar (consumed by status.js) & activity_logs
			const calendarPayload = { date: today, count: trackCount };
			const { error: calErr } = await supabase
				.from("listening_calendar")
				.upsert(calendarPayload, { onConflict: "date" });

			if (calErr) {
				await supabase
					.from("activity_logs")
					.upsert(calendarPayload, { onConflict: "date" });
			}

			console.log(`Streak updated: ${newStreak} days. Logged ${trackCount} tracks for ${today}.`);
		} else {
			// No activity today — reset streak
			const resetPayload = {
				id: 1,
				current_streak: 0,
				best_streak: streakRecord.best_streak || 0,
				last_active_date: streakRecord.last_active_date,
				total_days: streakRecord.total_days || 0,
			};

			await supabase.from(streakTable).upsert(resetPayload);
			if (streakTable === "streaks") {
				await supabase.from("streak").upsert(resetPayload).catch(() => {});
			}

			// Log 0 tracks for historical calendar
			const zeroPayload = { date: today, count: 0 };
			const { error: calErr } = await supabase
				.from("listening_calendar")
				.upsert(zeroPayload, { onConflict: "date" });

			if (calErr) {
				await supabase
					.from("activity_logs")
					.upsert(zeroPayload, { onConflict: "date" });
			}

			console.log("No activity today. Streak reset. Logged 0 tracks for calendar.");
		}
	} catch (err) {
		console.error("Streak update error:", err);
	}

	return { statusCode: 200 };
};

// Runs at 23:00 UTC = midnight WAT
export const handler = schedule("0 23 * * *", updateStreakHandler);
