// ── Greeting engine ──────────────────────────────────────────────
// Computes a rotating greeting line for the tutor dashboard.
// All greeting strings live here so they're easy to find and edit.
//
// Priority rules:
//   1. First login ever → always "Welcome to the team, [name]"
//   2. Contextual lines (pick randomly among all true conditions)
//   3. Fallback: random pick from simple + tutoring + funny pools
//
// [name] placeholders are replaced with the tutor's first name.

export interface GreetingInput {
  firstName: string
  isFirstLogin: boolean
  sessionsThisWeek: number
  daysSinceLastSession: number | null
  localHour: number
  localDayOfWeek: number
}

// ── Number → word (for "Two sessions", "Three sessions", etc.) ──
const NUMBER_WORDS: Record<number, string> = {
  2: "Two", 3: "Three", 4: "Four", 5: "Five",
  6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten",
  11: "Eleven", 12: "Twelve", 13: "Thirteen", 14: "Fourteen",
  15: "Fifteen", 16: "Sixteen", 17: "Seventeen", 18: "Eighteen",
  19: "Nineteen", 20: "Twenty",
}

function numberToWord(n: number): string {
  return NUMBER_WORDS[n] || String(n)
}

function sub(line: string, name: string): string {
  return line.replace(/\[name\]/g, name)
}

// ── Greeting pools ──────────────────────────────────────────────
// Lines with [name] get the tutor's first name substituted.
// Lines without [name] are shown as-is.

const FIRST_LOGIN_LINES = [
  "Welcome to the team, [name]",
]

const CONTEXTUAL = {
  morning:    "Good morning, [name]",
  lateNight:  "Working late?",
  shabbat:    "Shabbat Shalom, [name]",
  midweek:    "Hope the week's treating you well",
  away:       "Been a minute, welcome back",
  monday:     "Mondays happen, you've got this",
}

const SIMPLE_GREETINGS = [
  "Welcome back, [name]",
  "Good to see you",
  "Hey [name]",
  "Ready when you are",
  "Hello again, [name]",
  "Back at it",
  "Nice to see you, [name]",
  "[name]'s in the building",
  "Welcome back",
]

const TUTORING_GREETINGS = [
  "Your students are lucky to have you",
  "Let's grow some brains, [name]",
  "Go change a mind today",
  "Somebody's about to get smarter",
  "The tutor has entered the chat",
]

const FUNNY_GREETINGS = [
  "Oh good, you're back. The spreadsheet missed you",
  "Look busy, the students are coming",
  "Time to lock in, [name]",
  "You again? Love that for us",
  "Brains don't teach themselves",
  "Time to confidently guess every answer",
]

// ── Main computation ───────────────────────────────────────────

export function computeGreeting(input: GreetingInput, lastGreeting?: string | null): string {
  const { firstName, isFirstLogin, sessionsThisWeek, daysSinceLastSession, localHour, localDayOfWeek } = input

  // Rule 1 — first login ever
  if (isFirstLogin) {
    return sub(FIRST_LOGIN_LINES[0], firstName)
  }

  // Rule 2 — contextual (collect all true conditions, pick one at random)
  const candidates: string[] = []

  if (localHour < 12)  candidates.push(CONTEXTUAL.morning)
  if (localHour >= 20)  candidates.push(CONTEXTUAL.lateNight)
  if (localDayOfWeek === 5 || localDayOfWeek === 6) candidates.push(CONTEXTUAL.shabbat)
  if (localDayOfWeek >= 2 && localDayOfWeek <= 4 && localHour >= 12 && localHour < 20)   candidates.push(CONTEXTUAL.midweek)
  if (daysSinceLastSession !== null && daysSinceLastSession >= 30) candidates.push(CONTEXTUAL.away)
  if (sessionsThisWeek >= 2) candidates.push(`${numberToWord(sessionsThisWeek)} sessions in this week, nice`)
  if (localDayOfWeek === 1)  candidates.push(CONTEXTUAL.monday)

  if (candidates.length > 0) {
    const filtered = lastGreeting ? candidates.filter(c => sub(c, firstName) !== lastGreeting) : candidates
    const pool = filtered.length > 0 ? filtered : candidates
    return sub(pool[Math.floor(Math.random() * pool.length)], firstName)
  }

  // Rule 3 — fallback: random from simple + tutoring + funny
  const allFallbacks = [...SIMPLE_GREETINGS, ...TUTORING_GREETINGS, ...FUNNY_GREETINGS]
  const filteredFallbacks = lastGreeting ? allFallbacks.filter(g => sub(g, firstName) !== lastGreeting) : allFallbacks
  const fallbackPool = filteredFallbacks.length > 0 ? filteredFallbacks : allFallbacks
  return sub(fallbackPool[Math.floor(Math.random() * fallbackPool.length)], firstName)
}

// ── Montreal timezone helpers ───────────────────────────────────

export function getMontrealNow(): Date {
  const str = new Date().toLocaleString("en-US", { timeZone: "America/Montreal" })
  return new Date(str)
}

export function getMontrealInfo(): { hour: number; dayOfWeek: number } {
  const d = getMontrealNow()
  return { hour: d.getHours(), dayOfWeek: d.getDay() }
}

export function getMondayOfWeek(montrealNow: Date): Date {
  const d = new Date(montrealNow)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getMontrealTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montreal",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}