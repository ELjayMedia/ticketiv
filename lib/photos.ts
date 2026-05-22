/**
 * Curated Unsplash photography for placeholders and demo content.
 * In production these are swapped for organizer-uploaded posters
 * via Supabase Storage (events.poster_url).
 */
const UNSPLASH_BASE = "https://images.unsplash.com/";

function photo(id: string, w = 800, q = 70) {
  return `${UNSPLASH_BASE}${id}?w=${w}&auto=format&fit=crop&q=${q}`;
}

export const PHOTOS = {
  // DJ / electronic
  dj_console: photo("photo-1470229722913-7c0e2dbbafd3"),
  dj_neon: photo("photo-1571266028243-d220c6a0a3a4"),
  dj_set: photo("photo-1493676304819-0d7a8d026dcf"),

  // Concert crowds
  crowd_hands: photo("photo-1492684223066-81342ee5ff30"),
  crowd_lights: photo("photo-1429962714451-bb934ecdc4ec"),
  crowd_smoke: photo("photo-1459749411175-04bf5292ceea"),
  crowd_fest: photo("photo-1533174072545-7a4b6ad7a6c3"),
  crowd_aerial: photo("photo-1506157786151-b8491531f063"),

  // Stage / performer
  singer_red: photo("photo-1540039155733-5bb30b53aa14"),
  guitar_solo: photo("photo-1519397514979-6f6f64d4cdd9"),
  band_stage: photo("photo-1501386761578-eac5c94b800a"),

  // Comedy
  mic_stand: photo("photo-1518972559570-7cc1309f3229"),
  comedy_club: photo("photo-1585699324551-f6c309eedeca"),

  // Theatre
  theatre_curtain: photo("photo-1503095396549-807759245b35"),

  // Festival / outdoor
  fest_sunset: photo("photo-1506157786151-b8491531f063"),
  fest_river: photo("photo-1471478331149-c72f17e33c73"),

  // Food / cocktail
  food_market: photo("photo-1509315811345-672d83ef2fbc"),
  cocktail: photo("photo-1551024601-bec78aea704b"),

  // Workshop / talks
  workshop: photo("photo-1540575467063-178a50c2df87"),

  // Avatars (portrait crops)
  face_1: photo("photo-1500648767791-00dcc994a43e", 100),
  face_2: photo("photo-1494790108377-be9c29b29330", 100),
  face_3: photo("photo-1438761681033-6461ffad8d80", 100),
  face_4: photo("photo-1531427186611-ecfd6d936c79", 100),
  face_5: photo("photo-1517841905240-472988babdf9", 100),
  face_6: photo("photo-1544005313-94ddf0286df2", 100),
  face_7: photo("photo-1506794778202-cad84cf45f1d", 100),
  face_8: photo("photo-1487412720507-e7ab37603c6f", 100),
} as const;

export type PhotoKey = keyof typeof PHOTOS;
