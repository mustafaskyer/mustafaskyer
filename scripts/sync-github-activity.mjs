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
const eventsResponse = await fetch(
  `https://api.github.com/users/${login}/events?per_page=30`,
  {
    headers: {
      authorization: `Bearer ${token}`,
      "user-agent": "mustafaskyer-profile-sync",
    },
  },
);

if (!eventsResponse.ok) {
  throw new Error(`GitHub events request failed: ${eventsResponse.status}`);
}

const events = await eventsResponse.json();
const recentActivity = events.slice(0, 5).map(formatEvent).join("\n");

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

### Recent public activity

${recentActivity}
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

function formatEvent(event) {
  const date = event.created_at.slice(0, 10);
  const repo = event.repo?.name ?? login;
  const repoLink = `[${repo}](https://github.com/${repo})`;
  const payload = event.payload ?? {};

  switch (event.type) {
    case "PushEvent": {
      const branch = formatRef(payload.ref);
      const compareUrl = compareLink(repo, payload.before, payload.head);
      const target = compareUrl ? `[${branch}](${compareUrl})` : `\`${branch}\``;
      return `- ${date}: Pushed to ${repoLink} on ${target}.`;
    }
    case "CreateEvent": {
      const target = payload.ref_type === "repository"
        ? "repository"
        : `${payload.ref_type ?? "ref"} \`${payload.ref ?? repo}\``;
      return `- ${date}: Created ${target} in ${repoLink}.`;
    }
    case "ForkEvent": {
      const fork = payload.forkee?.full_name;
      const forkLink = fork ? `[${fork}](https://github.com/${fork})` : "a fork";
      return `- ${date}: Forked ${repoLink} into ${forkLink}.`;
    }
    case "WatchEvent":
      return `- ${date}: Starred ${repoLink}.`;
    case "PullRequestEvent": {
      const pr = payload.pull_request;
      const prLink = pr?.html_url ? `[#${pr.number}](${pr.html_url})` : "a pull request";
      return `- ${date}: ${capitalize(payload.action)} pull request ${prLink} in ${repoLink}.`;
    }
    case "PullRequestReviewEvent": {
      const review = payload.review;
      const pr = payload.pull_request;
      const reviewLink = review?.html_url
        ? `[reviewed PR #${pr?.number ?? ""}](${review.html_url})`
        : "reviewed a pull request";
      return `- ${date}: ${capitalize(review?.state ?? "reviewed")} ${reviewLink} in ${repoLink}.`;
    }
    case "IssuesEvent": {
      const issue = payload.issue;
      const issueLink = issue?.html_url ? `[#${issue.number}](${issue.html_url})` : "an issue";
      return `- ${date}: ${capitalize(payload.action)} issue ${issueLink} in ${repoLink}.`;
    }
    case "IssueCommentEvent": {
      const comment = payload.comment;
      const issue = payload.issue;
      const commentLink = comment?.html_url
        ? `[commented on #${issue?.number ?? ""}](${comment.html_url})`
        : "commented on an issue";
      return `- ${date}: ${capitalize(payload.action)} ${commentLink} in ${repoLink}.`;
    }
    case "ReleaseEvent": {
      const release = payload.release;
      const releaseLink = release?.html_url
        ? `[${release.tag_name}](${release.html_url})`
        : "a release";
      return `- ${date}: ${capitalize(payload.action)} release ${releaseLink} in ${repoLink}.`;
    }
    default:
      return `- ${date}: ${event.type.replace(/Event$/, "")} in ${repoLink}.`;
  }
}

function formatRef(ref) {
  return (ref ?? "main").replace(/^refs\/heads\//, "");
}

function compareLink(repo, before, head) {
  if (!before || !head || /^0+$/.test(before)) {
    return null;
  }

  return `https://github.com/${repo}/compare/${before}...${head}`;
}

function capitalize(value) {
  if (!value) {
    return "Updated";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
