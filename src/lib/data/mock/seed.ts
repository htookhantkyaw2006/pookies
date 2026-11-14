import { dateKeyInZone, shiftDateKey } from "@/lib/dates";
import { INVITE_LIFETIME_MS } from "../rules";
import type {
  AvatarStyle,
  CheckIn,
  Member,
  OfficeState,
  PresenceEntry,
  PresenceStatus,
  Role,
} from "../types";

export const CURRENT_USER_ID = "u-robin";
export const LOCAL_CONNECTION_ID = "local-tab";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface SeedPerson {
  id: string;
  name: string;
  avatar: AvatarStyle;
  timezone: string | null; // null = same zone as the viewer
  role: Role;
  status: PresenceStatus;
  note: string;
  connected: boolean;
  minutesAgo: number;
}

const PEOPLE: SeedPerson[] = [
  { id: CURRENT_USER_ID, name: "Robin Park", avatar: { color: "lilac", shape: "bear" }, timezone: null, role: "admin", status: "online", note: "", connected: true, minutesAgo: 2 },
  { id: "u-maya", name: "Maya Chen", avatar: { color: "peach", shape: "cat" }, timezone: null, role: "admin", status: "online", note: "Reviewing the launch checklist", connected: true, minutesAgo: 14 },
  { id: "u-leo", name: "Leo Martins", avatar: { color: "sky", shape: "round" }, timezone: "America/Sao_Paulo", role: "member", status: "busy", note: "Deep work until 3", connected: true, minutesAgo: 48 },
  { id: "u-aisha", name: "Aisha Khan", avatar: { color: "mint", shape: "bunny" }, timezone: "Europe/London", role: "member", status: "online", note: "Happy to pair", connected: true, minutesAgo: 6 },
  { id: "u-tomas", name: "Tomás Silva", avatar: { color: "butter", shape: "bear" }, timezone: "Europe/Lisbon", role: "member", status: "away", note: "At lunch", connected: true, minutesAgo: 22 },
  { id: "u-priya", name: "Priya Nair", avatar: { color: "rose", shape: "round" }, timezone: "Asia/Kolkata", role: "member", status: "online", note: "Writing release notes", connected: true, minutesAgo: 31 },
  { id: "u-hana", name: "Hana Sato", avatar: { color: "sky", shape: "cat" }, timezone: "Asia/Tokyo", role: "member", status: "busy", note: "In a customer call", connected: true, minutesAgo: 9 },
  { id: "u-kofi", name: "Kofi Mensah", avatar: { color: "mint", shape: "bear" }, timezone: "Africa/Accra", role: "member", status: "away", note: "School run, back at 4", connected: true, minutesAgo: 37 },
  { id: "u-jonas", name: "Jonas Weber", avatar: { color: "peach", shape: "bunny" }, timezone: "Europe/Berlin", role: "member", status: "online", note: "", connected: false, minutesAgo: 600 },
];

interface SeedCheckIn {
  userId: string;
  daysAgo: number;
  hoursAgo: number;
  yesterday: string;
  today: string;
  blockers?: string;
}

const CHECK_INS: SeedCheckIn[] = [
  // Today
  { userId: "u-maya", daysAgo: 0, hoursAgo: 3, yesterday: "Finished the pricing page copy and sent it for review.", today: "Launch checklist, then a dry run of the demo with Leo.", blockers: "Waiting on final logo files." },
  { userId: "u-leo", daysAgo: 0, hoursAgo: 2.5, yesterday: "Fixed the flaky signup test and merged the billing fix.", today: "Heads-down on the onboarding flow." },
  { userId: "u-priya", daysAgo: 0, hoursAgo: 2, yesterday: "Interviewed two customers about reporting.", today: "Writing release notes and tidying the help centre." },
  { userId: "u-hana", daysAgo: 0, hoursAgo: 1, yesterday: "Closed out last week's support queue.", today: "Customer calls most of the day, replies will be slow." },
  // Yesterday
  { userId: CURRENT_USER_ID, daysAgo: 1, hoursAgo: 26, yesterday: "Planned the sprint with Maya.", today: "Drafting the investor update and reviewing designs." },
  { userId: "u-maya", daysAgo: 1, hoursAgo: 27, yesterday: "Outlined the pricing page.", today: "Pricing page copy, first full draft." },
  { userId: "u-leo", daysAgo: 1, hoursAgo: 26.5, yesterday: "Paired with Aisha on the billing bug.", today: "Signup test flakiness, then the billing fix.", blockers: "Need staging database access." },
  { userId: "u-aisha", daysAgo: 1, hoursAgo: 25, yesterday: "Shipped the new empty states.", today: "Illustrations for the onboarding screens." },
  { userId: "u-tomas", daysAgo: 1, hoursAgo: 25.5, yesterday: "Reconciled October invoices.", today: "Supplier calls and the monthly numbers." },
  { userId: "u-priya", daysAgo: 1, hoursAgo: 24.5, yesterday: "Prepared the interview guide.", today: "Two customer interviews about reporting." },
  { userId: "u-kofi", daysAgo: 1, hoursAgo: 28, yesterday: "Set up the new analytics dashboard.", today: "Tracking plan for the onboarding flow." },
  // Two days ago
  { userId: CURRENT_USER_ID, daysAgo: 2, hoursAgo: 50, yesterday: "Caught up after the long weekend.", today: "Sprint planning with Maya." },
  { userId: "u-maya", daysAgo: 2, hoursAgo: 51, yesterday: "Competitor pricing research.", today: "Outline the pricing page." },
  { userId: "u-aisha", daysAgo: 2, hoursAgo: 49, yesterday: "Reviewed the design backlog.", today: "Empty states for the dashboard." },
  { userId: "u-jonas", daysAgo: 2, hoursAgo: 52, yesterday: "Migrated the email templates.", today: "Out tomorrow, wrapping up the newsletter today." },
  { userId: "u-hana", daysAgo: 2, hoursAgo: 49.5, yesterday: "Trained the new support macro set.", today: "Working through the support queue." },
];

/** Builds the sample office. Pure: the same inputs always give the same office. */
export function createSeed(now: number, viewerZone: string): OfficeState {
  const todayKey = dateKeyInZone(now, viewerZone);

  const members: Member[] = PEOPLE.map((person, index) => ({
    id: person.id,
    displayName: person.name,
    avatar: person.avatar,
    timezone: person.timezone ?? viewerZone,
    role: person.role,
    status: person.status,
    statusNote: person.note,
    statusUpdatedAt: now - person.minutesAgo * MINUTE,
    joinedAt: now - (90 - index * 7) * DAY,
  }));

  const presence: PresenceEntry[] = PEOPLE.filter((person) => person.connected).map(
    (person) => ({
      userId: person.id,
      connectionId: person.id === CURRENT_USER_ID ? LOCAL_CONNECTION_ID : `${person.id}-tab`,
      status: person.status,
      note: person.note,
      updatedAt: now - person.minutesAgo * MINUTE,
    }),
  );

  const checkIns: CheckIn[] = CHECK_INS.map((entry, index) => {
    const createdAt = now - entry.hoursAgo * HOUR;
    return {
      id: `seed-checkin-${index}`,
      userId: entry.userId,
      date: shiftDateKey(todayKey, -entry.daysAgo),
      yesterday: entry.yesterday,
      today: entry.today,
      blockers: entry.blockers ?? "",
      createdAt,
      updatedAt: createdAt,
    };
  });

  return {
    now,
    workspace: { id: "w-demo", name: "Sunny Side Studio" },
    currentUserId: CURRENT_USER_ID,
    members,
    presence,
    checkIns,
    invites: [
      {
        id: "invite-seed-1",
        token: "demo-welcome-aboard",
        createdBy: "u-maya",
        createdAt: now - 2 * DAY,
        expiresAt: now - 2 * DAY + INVITE_LIFETIME_MS,
        revokedAt: null,
        useCount: 2,
      },
      {
        id: "invite-seed-2",
        token: "demo-old-link",
        createdBy: CURRENT_USER_ID,
        createdAt: now - 12 * DAY,
        expiresAt: now - 12 * DAY + INVITE_LIFETIME_MS,
        revokedAt: null,
        useCount: 5,
      },
    ],
    things: {
      board: { text: "Ship day Friday! Demo at 3pm 🚀", authorId: "u-maya", updatedAt: now - 3 * HOUR },
      // A few plants were looked after recently; the rest could use some water.
      plants: {
        "plant-desks-1": now - 2 * HOUR,
        "plant-desks-4": now - 30 * HOUR,
        "plant-meeting-1": now - 5 * HOUR,
        "plant-lounge-1": now - 50 * HOUR,
        "plant-kitchen": now - 20 * HOUR,
      },
    },
  };
}
