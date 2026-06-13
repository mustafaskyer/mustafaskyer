import { readFile, writeFile } from "node:fs/promises";

const login = process.env.GITHUB_LOGIN ?? "mustafaskyer";
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error("Set GH_TOKEN or GITHUB_TOKEN before syncing GitHub activity.");
}

const query = `
  query ProfileActivity($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
        }
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
        totalRepositoryContributions
        restrictedContributionsCount
      }
    }
  }
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "user-agent": "mustafaskyer-profile-sync",
  },
  body: JSON.stringify({ query, variables: { login } }),
});

if (!response.ok) {
  throw new Error(`GitHub GraphQL request failed: ${response.status}`);
}

const payload = await response.json();
if (payload.errors?.length) {
  throw new Error(JSON.stringify(payload.errors, null, 2));
}

const collection = payload.data?.user?.contributionsCollection;
if (!collection) {
  throw new Error(`No contribution data returned for ${login}.`);
}

const number = new Intl.NumberFormat("en-US");
const syncedAt = new Date().toISOString().slice(0, 10);
const total = collection.contributionCalendar.totalContributions;

const block = `<!-- GITHUB-ACTIVITY:START -->
| GitHub contribution metric | Count |
| --- | ---: |
| GitHub-counted contributions | **${number.format(total)}** |
| Public commits | ${number.format(collection.totalCommitContributions)} |
| Public pull requests opened | ${number.format(collection.totalPullRequestContributions)} |
| Public pull request reviews | ${number.format(collection.totalPullRequestReviewContributions)} |
| Public issues opened | ${number.format(collection.totalIssueContributions)} |
| Public repositories created | ${number.format(collection.totalRepositoryContributions)} |
| Restricted/private contributions | ${number.format(collection.restrictedContributionsCount)} |

Last synced from GitHub: ${syncedAt}.
<!-- GITHUB-ACTIVITY:END -->`;

const readmePath = new URL("../README.md", import.meta.url);
const readme = await readFile(readmePath, "utf8");
const marker = /<!-- GITHUB-ACTIVITY:START -->[\s\S]*?<!-- GITHUB-ACTIVITY:END -->/;

if (!marker.test(readme)) {
  throw new Error("GITHUB-ACTIVITY block was not found.");
}

const nextReadme = readme.replace(
  marker,
  block,
);

if (nextReadme !== readme) {
  await writeFile(readmePath, nextReadme);
}
