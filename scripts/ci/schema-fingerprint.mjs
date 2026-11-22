import { createHash } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export function schemaFingerprint(root = new URL("../../supabase/migrations/", import.meta.url)) {
  const hash = createHash("sha256")
  for (const name of readdirSync(root).filter((file) => file.endsWith(".sql")).sort()) {
    hash.update(name).update("\0").update(readFileSync(new URL(name, root))).update("\0")
  }
  return hash.digest("hex")
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(schemaFingerprint())
