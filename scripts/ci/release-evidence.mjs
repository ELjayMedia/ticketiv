export function isTrustedUatRun(run, revision) {
  return run?.path === ".github/workflows/uat.yml" &&
    run.head_branch === "uat" && run.head_sha === revision &&
    run.repository?.full_name === "ELjayMedia/ticketiv" &&
    run.head_repository?.full_name === "ELjayMedia/ticketiv" &&
    ["push", "workflow_dispatch"].includes(run.event) &&
    run.status === "completed" && run.conclusion === "success"
}
