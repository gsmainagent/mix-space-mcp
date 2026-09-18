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
   * Happy-eyeball the candidate layouts once, then cache the one that answers.
   * Only a successful probe is cached, so a backend that is down at startup
   * gets re-probed on the next call instead of pinning a guess forever.
   */
  private async resolveEndpoint(): Promise<Endpoint> {
    if (this.cached) {
      return this.cached
    }

    this.probing ??= (async () => {
      for (const candidate of this.candidates) {
        try {
          await this.http.get(`${candidate.prefix}/posts`, {
            baseURL: candidate.baseURL,
            params: { page: 1, size: 1 },
            timeout: 5_000,
            validateStatus: (status) => status >= 200 && status < 300,
          })
          return candidate
        } catch {
          // Layout not served here; try the next candidate.
        }
      }
      return undefined
    })()

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
}