import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/sync-profile-activity.yml", import.meta.url),
  "utf8",
);
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

const requiredCron = 'cron: "0 0 * * *"';
if (!workflow.includes(requiredCron)) {
  throw new Error(`Activity sync workflow must run daily at 12:00 am UTC via ${requiredCron}.`);
}

if (!workflow.includes("workflow_dispatch:")) {
  throw new Error("Activity sync workflow must support manual dispatch.");
}

const marker = /<!-- GITHUB-ACTIVITY:START -->[\s\S]*?<!-- GITHUB-ACTIVITY:END -->/;
if (!marker.test(readme)) {
  throw new Error("README is missing the bounded GITHUB-ACTIVITY block.");
}
