import axios, { type AxiosInstance } from "axios"
import type { Config } from "./config.js"

interface Endpoint {
  baseURL: string
  prefix: string
}

const API_PREFIX_RE = /^\/api\/v\d+/i
const CONFIGURED_PREFIX_RE = /^(.*?)(\/api\/v\d+)$/i

/**
 * Candidate endpoint layouts for a configured URL. The deployed API does not
 * always carry an `/api/vN` segment, and tools pass prefix-relative paths, so
 * both the prefix and the bare origin have to be reachable.
 */
function buildCandidates(rawUrl: string): Endpoint[] {
  const url = rawUrl.replace(/\/+$/, "")
  const match = url.match(CONFIGURED_PREFIX_RE)

  if (match) {
    // Config already carries the API prefix: use it as-is, keeping the bare
    // origin as a fallback for deployments that serve the API at the root.
    return [
      { baseURL: match[1], prefix: match[2] },
      { baseURL: url, prefix: "" },
    ]
  }

  // Config is a bare origin: try the conventional prefix, then the origin.
  return [
    { baseURL: url, prefix: "/api/v2" },
    { baseURL: url, prefix: "" },
  ]
}

export interface RawResponse {
  status: number
  data: unknown
  contentType?: string
}

/** Upstream bodies may be JSON or plain text; only parse what looks like JSON. */
function parseBody(body: string, contentType?: string): unknown {
  if (body === "") {
    return null
  }
  const looksJson = (contentType && /json/i.test(contentType)) || /^\s*[[{]/.test(body)
  if (looksJson) {
    try {
      return JSON.parse(body)
    } catch {
      // Fall through and return the raw text.
    }
  }
  return body
}

export class MixSpaceClient {
  private http: AxiosInstance
  private candidates: Endpoint[]
  private cached?: Endpoint
  private probing?: Promise<Endpoint | undefined>

  constructor(config: Config) {
    const headers: Record<string, string> = {
      "User-Agent": "mixspace-mcp/1.0",
    }
    if (config.apiKey) {
      headers["x-api-key"] = config.apiKey
    }
    this.http = axios.create({
      headers,
      timeout: 30_000,
    })
    this.candidates = buildCandidates(config.apiUrl)
  }

  /**
   * Happy-eyeball the candidate layouts: race them in parallel and keep the
   * first that answers, so a dead or slow layout costs one round trip rather
   * than the sum of every candidate's timeout. Only a success is cached, so a
   * backend that is down at startup gets re-probed instead of pinning a guess.
   */
  private async resolveEndpoint(): Promise<Endpoint> {
    if (this.cached) {
      return this.cached
    }

    this.probing ??= this.probeAll()

    const found = await this.probing
    this.probing = undefined

    if (found) {
      this.cached = found
      return found
    }

    // Nothing answered: fall back to the first layout so the real request
    // produces the upstream error rather than a synthetic one.
    return this.candidates[0]
  }

  private async probeAll(): Promise<Endpoint | undefined> {
    const controllers = this.candidates.map(() => new AbortController())

    const attempts = this.candidates.map((candidate, i) =>
      this.http
        .get(`${candidate.prefix}/posts`, {
          baseURL: candidate.baseURL,
          params: { page: 1, size: 1 },
          timeout: 5_000,
          signal: controllers[i].signal,
          validateStatus: (status) => status >= 200 && status < 300,
        })
        .then(() => candidate)
    )

    try {
      return await Promise.any(attempts)
    } catch {
      return undefined
    } finally {
      // Cancel whichever candidates lost the race.
      for (const controller of controllers) {
        controller.abort()
      }
    }
  }

  async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    const clean: Record<string, unknown> = {}
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") {
          clean[k] = v
        }
      }
    }

    const endpoint = await this.resolveEndpoint()
    const relative = path.replace(API_PREFIX_RE, "")

    const res = await this.http.get<T>(endpoint.prefix + relative, {
      baseURL: endpoint.baseURL,
      params: clean,
    })
    return res.data
  }

  /**
   * GET an upstream path without throwing on non-2xx: the REST bridge forwards
   * the upstream status code and body verbatim. Network failures become 502.
   */
  async getRaw(path: string, params?: Record<string, string>): Promise<RawResponse> {
    const clean: Record<string, string> = {}
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== "") {
          clean[k] = v
        }
      }
    }

    const endpoint = await this.resolveEndpoint()
    const relative = path.replace(API_PREFIX_RE, "")

    try {
      const res = await this.http.get<string>(endpoint.prefix + relative, {
        baseURL: endpoint.baseURL,
        params: clean,
        responseType: "text",
        transformResponse: [(data: unknown) => data],
        validateStatus: () => true,
      })
      const contentType =
        typeof res.headers["content-type"] === "string" ? res.headers["content-type"] : undefined
      return { status: res.status, data: parseBody(res.data, contentType), contentType }
    } catch (err) {
      return {
        status: 502,
        data: { error: err instanceof Error ? err.message : String(err) },
        contentType: "application/json",
      }
    }
  }
}
