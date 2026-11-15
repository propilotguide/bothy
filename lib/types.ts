export type Habit = {
  id: string;
  slug: string;
  name: string;
  weekly_target: number;
  travel_ok: boolean;
  auto_source: "steps" | null;
  sort: number;
};

export type HabitView = {
  id: string;
  name: string;
  slug: string;
  target: number;
  done: boolean;
  /** Check-ins this week, not counting the selected day. */
  weekOther: number;
  auto: "steps" | null;
};

export const STEPS_GOAL = 10000;
