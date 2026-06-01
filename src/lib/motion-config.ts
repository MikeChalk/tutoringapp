// ── Motion animation timing ──────────────────────────────────
// All durations, delays, and easing curves in one place.
// Tweak these values to tune the feel without hunting through components.

export const DURATION_SCROLL_REVEAL = 0.5      // seconds — slide-up + fade for sections
export const DURATION_FADE_IN = 0.3             // seconds — simple opacity fade
export const DELAY_STAGGER = 0.1               // seconds — delay between successive sections
export const DURATION_COUNT_UP = 0.8           // seconds — animated number transition
export const COUNT_UP_DECIMALS = 2              // decimal places for dollar amounts

export const EASE_DEFAULT: [number, number, number, number] = [0.25, 0.1, 0.25, 1]  // cubic-bezier — gentle ease-out
export const EASE_COUNT_UP: [number, number, number, number] = [0.16, 1, 0.3, 1]    // cubic-bezier — snappy ease-out

export const SCROLL_THRESHOLD = 0.15  // fraction of element visible to trigger reveal

// ── Welcome overlay timing ──────────────────────────────────
export const WELCOME_HOLD_FULL = 3000    // ms — full welcome hold on first daily login
export const WELCOME_HOLD_BRIEF = 1000    // ms — brief welcome on subsequent logins same day
export const WELCOME_TEXT_DURATION_FULL = 0.6   // seconds — greeting text fade-in (full)
export const WELCOME_TEXT_DURATION_BRIEF = 0.3  // seconds — greeting text fade-in (brief)
export const WELCOME_SUBLINE_DELAY_FULL = 0.3   // seconds — subline delay (full)
export const WELCOME_SUBLINE_DELAY_BRIEF = 0.15 // seconds — subline delay (brief)
export const WELCOME_FADE_DURATION = 0.4        // seconds — panel fade-out duration
export const WELCOME_FADE_EASE = "easeInOut" as const
export const WELCOME_SUBLINE_FADE_DURATION = 0.4  // seconds — subline text fade-in