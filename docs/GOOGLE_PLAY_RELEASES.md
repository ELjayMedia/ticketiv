# Google Play listings and releases

The Google Play workflows cover two separate apps:

| Workflow app | Android package | Signed internal workflow |
| --- | --- | --- |
| `ticketiv` | `com.ticketiv.app` | `Ticketiv Android` |
| `access` | `com.ticketiv.access` | `Access Android` |

Listing changes and production promotion are explicit manual operations. Ordinary
pull requests and pushes validate changes and build unsigned bundles; they do not
publish a listing or start a public rollout.

## Listing source of truth

Each app keeps its Google Play content in
`apps/<app>/store-listing/listing.json`. Its `listings` object contains localized
titles, short descriptions and full descriptions. Its `images` object lists
local image files by locale and Google Play image type:

```json
{
  "packageName": "com.ticketiv.app",
  "defaultLanguage": "en-US",
  "imagePolicy": "replace",
  "listings": {
    "en-US": {
      "title": "Ticketiv",
      "shortDescription": "Discover events and keep your tickets close.",
      "fullDescription": "Reviewed store description."
    }
  },
  "images": {
    "en-US": {
      "icon": ["images/en-US/icon.png"],
      "featureGraphic": ["images/en-US/feature-graphic.png"],
      "phoneScreenshots": [
        "images/en-US/phone-1.png",
        "images/en-US/phone-2.png"
      ]
    }
  }
}
```

Image paths are relative to the app's `store-listing` directory. Keep real device
screenshots that match the release, and remove personal data before committing
them. Do not substitute web previews or mock screens for native app screenshots.
The existing `whatsnew/whatsnew-en-US` files remain the release notes used by the
internal upload workflow; review them for every release.
Each additional listing locale also needs a matching
`whatsnew/whatsnew-<locale>` file before validation can pass.

The initial manifests use `imagePolicy: "preserve-existing"` because both apps
already have approved assets in Play Console. Sync preserves those images and
checks that the required icon, feature graphic and phone screenshots exist for
every declared locale before committing the edit. Do not include local image
paths with this policy. This permits reviewed text updates without replacing the
approved graphics.

Use `imagePolicy: "replace"` when committing assets exported from Play Console or
reviewed replacement images. Strict publication then requires complete, valid
local assets for every declared locale. An ordinary source check accepts an
incomplete replacement asset set so drafts can be reviewed; publication rejects it.

## Import an existing Play Console listing

Run **Google Play listings** (`.github/workflows/play-listings.yml`) from `main`,
choose the relevant `app`, and set `operation` to `export`. Download the
`google-play-listing-<app>-<run_id>` artifact, review the text and images, then copy the
exported `listing.json` and image directory into that app's `store-listing`
directory in a pull request. Preserve `whatsnew/` release notes when copying.
The export uses `imagePolicy: "replace"` so the committed files become the
reviewable source of truth. Export artifacts are retained for 30 days.

Export reads the existing listing into an uncommitted Play edit and discards the
edit; it does not publish changes. Treat the artifact as source material to
review, not proof that every claim or screenshot matches the next release.

For a locally configured service account, the equivalent command is:

```bash
node scripts/google-play.mjs export --app ticketiv --output /tmp/ticketiv-play-listing
```

The `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` environment variable must contain the
service-account JSON. Do not put credentials in command-line arguments, repository
files or exported listing assets. Prefer the GitHub workflow so credentials stay
in GitHub Secrets.

## Validate and sync a listing

Run the listing validation commands locally before opening a pull request:

```bash
node scripts/validate-play-listings.mjs
node scripts/validate-play-listings.mjs --app ticketiv --require-images
```

The validator checks package identity, locale structure, description lengths, image
types and dimensions, and that image paths stay inside the listing directory.
With the replacement policy, strict publication also requires an icon, feature
graphic and at least two phone screenshots for every locale. With the preservation
policy, the publishing script checks the actual Play Console image set.

After review and merge, run **Google Play listings** from `main`, select the app,
set `operation` to `sync`, and enter `SYNC_GOOGLE_PLAY_LISTING` in `confirmation`.
It validates local content before opening a Play edit,
updates the supplied localized text and image types, validates the edit with
Google Play and commits it. Listing sync can change the public store page
independently of an app rollout; review it with the same care as a release.

The corresponding command is:

```bash
node scripts/google-play.mjs sync --app ticketiv
```

## Upload an internal release

1. Merge the release candidate to `main` and wait for CI and the selected app's
   Android push workflow to pass for that exact commit.
2. Run `Ticketiv Android` or `Access Android` from `main`, enable
   `build_upload_signed_play`, enter the app's existing confirmation token, and
   enable `publish_to_play_internal`.
3. The signed job runs `pnpm check:release`, builds and verifies the signed AAB,
   and uploads it to Play's `internal` track. Record its run ID, full commit SHA
   and version code. The version code is that workflow's run number.
4. After a successful internal upload, the job records a release receipt artifact
   containing the app/package, commit, run ID, run attempt, version code and SHA-256
   of the signed AAB. Keep the source run; production promotion requires its
   unexpired receipt. A successful unsigned build is not a release receipt.
5. Test that internal release on physical devices and record the evidence
   required by [release readiness](RELEASE_READINESS.md) for the exact commit.

The existing per-app signing secrets remain required, together with
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` when publishing. The service account must have
Play Console access to the chosen package and the listing/release permissions
needed for the operation. GitHub secret names and permissions are configuration;
the repository does not contain their values.

## Promote the verified bundle to production

Run **Google Play production promotion** (`.github/workflows/play-production.yml`)
from `main`. Select `app` and supply `release_commit` (the full lowercase
40-character SHA), `source_run_id` (the successful signed internal workflow run),
`version_code`, and `release_confirmation`. The confirmation is
`PROMOTE_TICKETIV_PLAY` for Ticketiv or `PROMOTE_TICKETIV_ACCESS_PLAY` for Access.
The promotion job uses the `google-play-production` GitHub environment; configure
required reviewers there if a separate release-owner approval is desired.

The workflow checks all of the following before any production update:

- The release commit is still on `main`.
- The latest CI push run and selected Android push run succeeded for that exact
  commit.
- The source run is a successful manual dispatch of the selected app's Android
  workflow on `main`, with the same commit and version code.
- The signed-build, signature-verification and internal-upload steps actually
  succeeded; skipped jobs or steps do not qualify.
- The source receipt matches the run, attempt, app, package, commit and version.
- Google Play's internal track contains the selected version, and its bundle
  SHA-256 matches the signed receipt.
- The versioned listing passes strict validation and is synced successfully.

Production listing sync and rollout promotion share one validated Play edit, so a failed promotion does not publish the listing separately.

Promotion reuses the verified internal bundle. It does not rebuild an AAB or select
the newest bundle by position. The production operation starts a staged rollout
with a default fraction of `0.1` (10%). Review the resulting release in Play
Console, monitor it and manage subsequent rollout increases or halts there.
Google Play may still require review before users receive the release.

Google Play may require the first production release to be created in Play
Console before staged rollouts are available. If the API rejects that initial
release, complete the Console bootstrap with the release owner after the same
verification and device checks. This workflow does not fall back to a full
production release or bypass Google's review requirements.

The low-level promotion command is intended for the verified workflow; running it
alone does not perform the GitHub source-run checks:

```bash
node scripts/google-play.mjs promote --app ticketiv --version-code 123 --bundle-sha256 <verified-sha256> --user-fraction 0.1
```

Older internal releases without a receipt cannot be promoted by this workflow.
Produce a new internal release from a verified `main` commit instead of bypassing
the checks.

## Console and physical-device checks

Automation does not complete Play Console declarations. Before public release,
review the live privacy-policy and account-deletion URLs, Data safety answers,
content rating, target audience, app-access/reviewer instructions, contact details,
country availability and any pending policy requirements. Confirm claims in the
listing against the shipped app. Preserve the physical-device and UAT evidence
required by [release readiness](RELEASE_READINESS.md).

These workflows cover Google Play. Huawei AppGallery submission and iOS App Store
build/submission remain separate work.
