import { describe, expect, it } from "vitest"

import { artistErrorMessage, canRemoveArtistMember, cleanLinks, parseGenres } from "@/lib/artists/core"

describe("artist rules", () => {
  it("mirrors fn_remove_artist_member", () => {
    expect(canRemoveArtistMember("artist_owner", "artist_owner", true)).toBe(false)
    expect(canRemoveArtistMember("artist_owner", "artist_manager", false)).toBe(true)
    expect(canRemoveArtistMember("artist_manager", "artist_manager", true)).toBe(true)
    expect(canRemoveArtistMember("artist_manager", "artist_manager", false)).toBe(false)
    expect(canRemoveArtistMember(null, "artist_manager", false)).toBe(false)
  })

  it("normalises genres like the RPC", () => {
    expect(parseGenres(" Gospel, gospel ,Choral,, ")).toEqual(["gospel", "choral"])
    expect(parseGenres("a,b,c,d,e,f,g,h,i,j")).toHaveLength(8)
  })

  it("keeps only known, non-empty links", () => {
    expect(cleanLinks({ instagram: " https://instagram.com/x ", myspace: "https://m", website: "" })).toEqual({ instagram: "https://instagram.com/x" })
  })

  it("maps RPC errors to plain language", () => {
    expect(artistErrorMessage({ message: "artist_exists" })).toMatch(/already on Ticketiv/)
    expect(artistErrorMessage({ message: "x", code: "23514" })).toMatch(/https/)
  })
})
