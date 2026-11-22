import { describe, expect, it } from "vitest"
import { deployRelease, patchUatCompose, validateRelease } from "../scripts/ci/deploy-coolify.mjs"

const revision = "a".repeat(40)
const previousRevision = "b".repeat(40)
const digest = `sha256:${"c".repeat(64)}`
const previousCompose = `services:\n  ticketiv-uat-web:\n    image: ticketiv-uat:old\n    pull_policy: never\n    environment:\n      - SOURCE_COMMIT=${previousRevision}\n      - DEPLOYMENT_ENV=uat\n`

describe("release target validation", () => {
  it.each([["uat", "main"], ["production", "uat"], ["other", "uat"]])("rejects %s from %s", (environment, branch) => {
    expect(() => validateRelease(environment, digest, revision, branch)).toThrow()
  })
  it("rejects mutable tags and shortened revisions", () => {
    expect(() => validateRelease("uat", "latest", revision, "uat")).toThrow("digest")
    expect(() => validateRelease("uat", digest, "abcdef", "uat")).toThrow("full Git")
  })
  it("updates only the UAT image and revision, preserving runtime configuration", () => {
    const result = patchUatCompose(previousCompose, `ghcr.io/eljaymedia/ticketiv@${digest}`, revision)
    expect(result).toContain(`image: ghcr.io/eljaymedia/ticketiv@${digest}`)
    expect(result).toContain(`SOURCE_COMMIT=${revision}`)
    expect(result).toContain("DEPLOYMENT_ENV=uat")
    expect(result).toContain("pull_policy: if_not_present")
    expect(() => patchUatCompose(previousCompose + "    image: unrelated:latest\n", digest, revision)).toThrow("exactly one")
  })
})

describe("deployment health and rollback", () => {
  function harness(failNew: boolean) {
    let raw = previousCompose
    let running = previousRevision
    const revisions: string[] = []
    const api = async (path: string, method = "GET", data?: { docker_compose_raw?: string }) => {
      if (method === "PATCH") raw = Buffer.from(data!.docker_compose_raw!, "base64").toString()
      if (path.endsWith("/restart")) {
        running = raw.includes(revision) ? revision : previousRevision
        revisions.push(running)
      }
      return { docker_compose_raw: raw }
    }
    const health = async () => ({ ok: !(failNew && running === revision), revision: running })
    return { api, health, pause: async () => {}, attempts: 2, revisions }
  }
  it("accepts the exact healthy revision", async () => {
    const h = harness(false)
    const result = await deployRelease(validateRelease("uat", digest, revision, "uat"), h)
    expect(result.previousRevision).toBe(previousRevision)
    expect(h.revisions).toEqual([revision])
  })
  it("restores the previous deployment when the candidate fails health checks", async () => {
    const h = harness(true)
    await expect(deployRelease(validateRelease("uat", digest, revision, "uat"), h)).rejects.toThrow("previous healthy revision was restored")
    expect(h.revisions).toEqual([revision, previousRevision])
    expect((await h.health()).ok).toBe(true)
  })
})
