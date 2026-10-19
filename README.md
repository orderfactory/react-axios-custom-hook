# react-axios-custom-hook

A custom React hook, `useAxios`, that loads data with retries, backoff, cancellation, and a timeout, demonstrated on a weather page whose API fails on purpose. [React, TypeScript, C#, .NET, Aspire]

This repository is the companion to the article [Custom React Hooks: A useAxios Hook and the Bugs Its Tests Found](https://www.orderfactory.com/articles/custom-react-hooks-useaxios.html). The article explains when a custom hook is worth writing, what tests found in the first version of this hook, and why the corrected version below is shaped the way it is.

## Project structure

- **frontend**: React 19 and TypeScript, built with Vite.
  - `src/hooks/getWithRetry.ts`: a plain function that sends a GET request with Axios, retries 500, 502, 503, and 504 with exponential backoff and full jitter, stops waiting as soon as its signal aborts, and gives each attempt a timeout.
  - `src/hooks/useAxios.ts`: the hook. Every request belongs to the effect run that started it, and that run's cleanup aborts it.
  - `src/weather-forecast/useWeatherForecast.ts`: a domain hook that says what the page wants: the forecast, with seven attempts.
  - `src/weather-forecast/WeatherForecast.tsx`: the page.
- **ReactAxiosCustomHook.WebApi**: an ASP.NET Core minimal API. `GET /api/weatherforecast` waits 500 milliseconds, then returns five forecasts with a 30 percent chance; otherwise it answers 503 Service Unavailable, on purpose. When published, it also serves the built frontend.
- **ReactAxiosCustomHook.ServiceDefaults**: Aspire service defaults: OpenTelemetry, health checks, service discovery, and resilience.
- **ReactAxiosCustomHook.AppHost**: the Aspire AppHost. It runs the API and the Vite dev server for development and deploys both as one container with Docker Compose.

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 22.22 or later 22.x, 24.15 or later 24.x, or 26 and later, with npm
- Optional: the [Aspire CLI](https://aspire.dev/get-started/install-cli/). Without it, `dotnet run` fetches the CLI on demand.
- For deployment only: Docker or Podman, for example [Rancher Desktop](https://rancherdesktop.io/)

### Run

```sh
git clone https://github.com/orderfactory/react-axios-custom-hook.git
cd react-axios-custom-hook
aspire run
```

Without the Aspire CLI, run `dotnet run --project ReactAxiosCustomHook.AppHost` instead, or open `ReactAxiosCustomHook.slnx` in Visual Studio 2026 and start the AppHost project.

The AppHost installs the npm packages, starts the API, waits for its health check, and then starts Vite. Open the dashboard link that the console prints, then the URL of the `frontend` resource, and click **Fetch Weather**. The dashboard's traces show each attempt: 503s, then the request that succeeded. Click twice in a row, and the first request ends with status 499, Client Closed Request, because the hook aborted it.

In development, the browser calls `/api/weatherforecast` on the Vite dev server, which proxies it to the API. Aspire passes the API's address to Vite in the `WEBAPI_HTTPS` and `WEBAPI_HTTP` environment variables, so the API needs no CORS policy.

### Test, lint, and build

```sh
cd frontend
npm test          # Vitest in watch mode; npx vitest run runs the tests once
npm run lint      # ESLint, with the recommended preset of eslint-plugin-react-hooks
npm run build     # type-check with tsc -b, then build with Vite
```

- `useAxios.test.ts` is the test from the article. It replaces `getWithRetry` with a fake network and runs under Strict Mode.
- `useAxios.server.test.ts` and `getWithRetry.test.ts` run the real code against a small local server that delays, fails, or never answers, and logs every request, including the ones the client gave up on. They cover two quick calls, a new URL during a retry, an unmount during a request, a server that never answers, the retry count, the jitter, and Strict Mode.
- `WeatherForecast.test.tsx` renders the page and clicks its button.

### Deploy with Docker Compose

```sh
aspire deploy
```

The AppHost declares a Docker Compose environment, so `aspire deploy` builds the frontend in a Node container and copies the result into the web API's image as `wwwroot`. It then starts that image with Docker Compose, next to an Aspire dashboard that receives the API's telemetry. When it finishes, it prints both URLs, for example `webapi: http://localhost:32769`; Docker picks the host ports. The web API serves both the React app and `/api`, so the browser talks to a single origin. The deployment uses the Production environment, so the API's health and OpenAPI endpoints are off.

The generated `docker-compose.yaml` and `.env` files go to `ReactAxiosCustomHook.AppHost/aspire-output`, which Git ignores; `aspire publish` writes them without building or starting anything. To stop the containers and remove them and their network, run `aspire destroy`.

Without the Aspire CLI installed, run the same commands through the .NET SDK, for example `dotnet dnx aspire.cli -- deploy`.

## Usage

```tsx
import { useAxios } from "../hooks/useAxios.ts";

export function WeatherForecast() {
  const { data, loading, error, fetchData } = useAxios<Forecast[]>(
    "/api/weatherforecast",
    { retries: 6, delay: 50, autoFetch: false },
  );
  return (
    <>
      <button onClick={fetchData}>Fetch Weather</button>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      <ul>
        {data?.map((f) => (
          <li key={f.date}>{f.date}: {f.summary}</li>
        ))}
      </ul>
    </>
  );
}
```

In the demo, the page calls the domain hook `useWeatherForecast()` instead, which wraps this call. A component that asks for the forecast by purpose does not change if `useAxios` gives way to a library such as TanStack Query.

### Options

| Option      | Default  | Meaning                                                                                                   |
|-------------|----------|-----------------------------------------------------------------------------------------------------------|
| `retries`   | `3`      | Retries after the first attempt, for responses 500, 502, 503, and 504. `retries: 6` allows seven attempts. |
| `delay`     | `1000`   | The ceiling, in milliseconds, for the first wait. It doubles with each retry, and each wait is random below it. |
| `timeout`   | `10000`  | The timeout, in milliseconds, for each attempt.                                                           |
| `autoFetch` | `true`   | Fetch when the component mounts. With `false`, the hook waits for the first `fetchData()` call; after that, a new URL fetches on its own. |

### Result

| Field       | Meaning                                                                                                   |
|-------------|-----------------------------------------------------------------------------------------------------------|
| `data`      | The last data for the current URL, or `null`. A refetch of the same URL keeps it on screen, and so does a failed refetch. A new URL clears it at once. |
| `error`     | The error of the current request, or `null`. It is the `Error` that was thrown, so `axios.isAxiosError(error)` gives access to the status. |
| `loading`   | `true` until the current request settles.                                                                 |
| `fetchData` | Asks for a new request. Its identity never changes, so it is safe in effect dependencies.                 |

### Behavior

- A new URL, a changed option, a `fetchData()` call, or an unmount aborts the request in flight, along with any retry waiting in its backoff. A canceled request never touches state.
- `loading` and the shown `data` are computed from one stored result, which is tagged with the URL and the request that produced it.
- The hook sends only GET requests. Writes belong in event handlers, and a POST should not be retried automatically unless the server applies it once, for example through an idempotency key.
- There is no cache and no deduplication: two components that ask for the same URL send two requests. When you need those, use TanStack Query or SWR, and keep the domain hook.
- A 503's `Retry-After` header is not honored; see the article for the rules a production client should follow.

## License

[MIT](LICENSE)
