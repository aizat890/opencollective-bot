import Octokit, {
  Response,
  IssuesCreateCommentResponse,
  IssuesAddLabelsResponseItem,
} from '@octokit/rest'
import { Message } from './config'

export type GithubLabel = string
export interface GithubIssue {
  owner: string
  number: number
  repo: string
}

/**
 *
 * Returns a list of user organisations.
 *
 * @param context
 */
export async function getUserOrganisations(
  github: Octokit,
  username: string,
): Promise<string[]> {
  return github.orgs
    .listForUser({
      username: username,
    })
    .then(res => res.data.map(org => org.login))
}

/**
 *
 * Strips GitHub username from GitHub URL in Open Collective response.
 *
 * @param url
 */
export function stripGithubName(url: string): string {
  const matches = url.match(/https:\/\/github.com\/([\w\-]+)(?:\/.*)?/)
  /* istanbul ignore if */
  if (!matches || matches.length < 2) {
    throw new Error(`Couldn't parse Github URL ${url}.`)
  }
  return matches[1]
}

/**
 *
 * Adds messages to a GitHub Issue.
 *
 * @param github
 * @param issue
 * @param messages
 */
export async function messageGithubIssue(
  github: Octokit,
  issue: GithubIssue,
  messages: Message[],
): Promise<Response<IssuesCreateCommentResponse>[]> {
  const actions = messages.map(message =>
    github.issues.createComment({
      repo: issue.repo,
      owner: issue.owner,
      number: issue.number,
      body: message,
    }),
  )

  return Promise.all(actions)
}

/**
 *
 * Adds labels to a GitHub Issue and ensures they all exist.
 *
 * @param github
 * @param issue
 * @param messages
 */
export async function labelGithubIssue(
  github: Octokit,
  issue: GithubIssue,
  labels: GithubLabel[],
): Promise<Response<IssuesAddLabelsResponseItem[]>> {
  /**
   * Flow
   * 1. Check if all labels exist.
   * 2. Create missing ones.
   * 3. Add labels to issue.
   */

  const actions = labels.map(async label =>
    github.issues
      .getLabel({ ...issue, name: label })
      .then(() => Promise.resolve())
      .catch(() =>
        github.issues.createLabel({
          ...issue,
          name: label,
          color: 'fbca04',
        }),
      ),
  )

  await Promise.all(actions)

  return github.issues.addLabels({
    repo: issue.repo,
    owner: issue.owner,
    number: issue.number,
    labels: labels,
  })
}

/**
 *
 * Removes labels from a GitHub Issue.
 *
 * @param github
 * @param issue
 * @param messages
 */
export async function removeLabelsFromGithubIssue(
  github: Octokit,
  issue: GithubIssue,
  labels: GithubLabel[],
): Promise<GithubLabel[]> {
  const actions = labels.map(label =>
    github.issues.removeLabel({
      repo: issue.repo,
      owner: issue.owner,
      number: issue.number,
      name: label,
    }),
  )

  await Promise.all(actions)
  return labels
}
