export interface Config {
  apiUrl: string
  apiKey?: string
}

export function loadConfig(args: string[]): Config {
  let apiUrl = process.env.MIXSPACE_API_URL ?? "http://localhost:2323"
  let apiKey = process.env.MIXSPACE_API_KEY

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--url" && args[i + 1]) {
      apiUrl = args[++i]
    } else if (arg === "--key" && args[i + 1]) {
      apiKey = args[++i]
    } else if (arg.startsWith("--url=")) {
      apiUrl = arg.slice("--url=".length)
    } else if (arg.startsWith("--key=")) {
      apiKey = arg.slice("--key=".length)
    }
  }

  apiUrl = apiUrl.replace(/\/+$/, "")

  return { apiUrl, apiKey }
}
