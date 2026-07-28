import { getDeploymentSafetyBanner } from "@/lib/deployment-safety"

export function DeploymentEnvironmentBanner() {
  const banner = getDeploymentSafetyBanner()
  if (!banner) return null

  return (
    <div role="status" className="border-b border-warning/40 bg-[#fff7ed] text-[#7a3414]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[12px] leading-snug sm:px-4">
        <span className="font-mono font-semibold uppercase">{banner.label}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
        <span className="min-w-0 font-medium">{banner.message}</span>
        {banner.branchLabel && (
          <span className="font-mono text-[11px] text-[#9a3412]">{banner.branchLabel}</span>
        )}
      </div>
    </div>
  )
}
