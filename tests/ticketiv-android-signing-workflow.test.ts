import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const workflow = readFileSync(join(root, ".github/workflows/ticketiv-android.yml"), "utf8")
const gradle = readFileSync(join(root, "apps/ticketiv/android/app/build.gradle"), "utf8")

const SIGNING_SECRETS = [
  "TICKETIV_UPLOAD_KEYSTORE_BASE64",
  "TICKETIV_UPLOAD_STORE_PASSWORD",
  "TICKETIV_UPLOAD_KEY_ALIAS",
  "TICKETIV_UPLOAD_KEY_PASSWORD",
]

describe("Ticketiv Android upload signing", () => {
  it("keeps automatic PR and push bundles unsigned", () => {
    expect(workflow).toContain("Build unsigned release AAB")
    expect(workflow).toContain("ticketiv-${{ matrix.target }}-unsigned-${{ github.run_attempt }}")

    const unsignedJob = workflow.slice(
      workflow.indexOf("  release-bundle:"),
      workflow.indexOf("  upload-signed-play-bundle:"),
    )
    for (const secret of SIGNING_SECRETS) {
      expect(unsignedJob).not.toContain(`secrets.${secret}`)
    }
  })

  it("runs the signed Play build only through an explicit dispatch from main", () => {
    expect(workflow).toContain("build_upload_signed_play:")
    expect(workflow).toContain("default: false")
    expect(workflow).toContain("release_confirmation:")
    expect(workflow).toContain("inputs.release_confirmation == 'UPLOAD_TICKETIV_PLAY'")
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'")
    expect(workflow).toContain("github.ref == 'refs/heads/main'")
    expect(workflow).toContain("inputs.build_upload_signed_play")
    expect(workflow).not.toContain("environment:")
    expect(workflow).toContain("github.event_name != 'workflow_dispatch' || !inputs.build_upload_signed_play")
    expect(workflow).toContain("'upload-signed' || github.ref")
    expect(workflow).toContain("cancel-in-progress: ${{ github.event_name != 'workflow_dispatch' || !inputs.build_upload_signed_play }}")
    expect(workflow).toContain("ref: ${{ github.sha }}")
    expect(workflow).toContain("pnpm --filter @ticketiv/app-consumer native:bundle:play")
    expect(workflow).not.toContain("native:bundle:huawei\n\n      - name: Verify signature")
  })

  it("requires every upload-key secret without putting values in the repository", () => {
    for (const secret of SIGNING_SECRETS) {
      expect(workflow).toContain(`${secret}: \${{ secrets.${secret} }}`)
      expect(workflow).toContain(`if [[ -z "\${!name:-}" ]]`)
    }

    expect(workflow).toContain('keystore_path="$RUNNER_TEMP/ticketiv-upload.keystore"')
    expect(workflow).toContain('install -m 600 /dev/null "$keystore_path"')
    expect(workflow).toContain("base64 --decode")
    expect(workflow).toContain('if: always() && steps.keystore.outcome != \'skipped\'')
    expect(workflow).toContain('rm -f "$RUNNER_TEMP/ticketiv-upload.keystore"')
  })

  it("cryptographically verifies the AAB and emits only public fingerprints", () => {
    expect(workflow).toContain("jarsigner -verify -verbose -certs")
    expect(workflow).toContain("grep -q '^jar verified\\.$'")
    expect(workflow).toContain("keytool -printcert -jarfile")
    expect(workflow).toContain("-storepass:env TICKETIV_UPLOAD_STORE_PASSWORD")
    expect(workflow).toContain('test "$bundle_fingerprint" = "$upload_fingerprint"')
    expect(workflow).toContain("certificate_sha256=$bundle_fingerprint")
    expect(workflow).toContain("not the Play App Signing certificate for assetlinks.json")
    expect(workflow).toContain("ticketiv-play-upload-signed.aab")
    expect(workflow).toContain("retention-days: 7")
  })

  it("fails Gradle configuration when only part of the signing contract is present", () => {
    for (const name of [
      "TICKETIV_UPLOAD_STORE_FILE",
      "TICKETIV_UPLOAD_STORE_PASSWORD",
      "TICKETIV_UPLOAD_KEY_ALIAS",
      "TICKETIV_UPLOAD_KEY_PASSWORD",
    ]) {
      expect(gradle).toContain(`"${name}"`)
    }

    expect(gradle).toContain("configuredUploadSigningEnvironment.size() != uploadSigningEnvironment.size()")
    expect(gradle).toContain("Incomplete Ticketiv upload signing configuration")
    expect(gradle).toContain("if (!uploadStoreFile.isFile())")
    expect(gradle).toContain("if (uploadSigningConfigured)")
  })
})
