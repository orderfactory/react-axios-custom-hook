# frontend

The demo's React page, built with Vite and TypeScript. It runs under the Aspire AppHost (see the [root README](../README.md)), which installs the npm packages, starts the dev server, and passes it the web API's address in the `WEBAPI_HTTPS` and `WEBAPI_HTTP` environment variables. The dev server proxies `/api` to that address.

## Scripts

| Script            | What it does                                                                                   |
|-------------------|------------------------------------------------------------------------------------------------|
| `npm run dev`     | Starts the Vite dev server. The AppHost runs it for you.                                       |
| `npm test`        | Runs Vitest in watch mode; `npx vitest run` runs the tests once.                               |
| `npm run lint`    | Runs ESLint with typescript-eslint, eslint-plugin-react-hooks, and eslint-plugin-react-refresh. |
| `npm run build`   | Type-checks with `tsc -b` and builds to `dist`.                                                |
| `npm run preview` | Serves the build locally.                                                                      |

## Layout

- `src/hooks/getWithRetry.ts`: the retry loop, a plain function.
- `src/hooks/useAxios.ts`: the hook.
- `src/weather-forecast/`: the domain hook `useWeatherForecast` and the page that calls it.
- `src/test/`: the test setup and a local HTTP server that the tests use as their API.
- Tests sit next to the code they test, as `*.test.ts` and `*.test.tsx`.

## Configuration notes

- Linting uses the recommended preset of eslint-plugin-react-hooks, which includes the React Compiler's checks. The React Compiler itself is not enabled.
- TypeScript stays on 6.0 because typescript-eslint supports only TypeScript versions below 6.1.
- `tsconfig.app.json` keeps the tests out of the app; `tsconfig.test.json` type-checks them, with Node's types.
- Vitest runs the tests in jsdom. `getWithRetry.test.ts` opts into the Node environment, so the two environments exercise both of Axios's adapters: XMLHttpRequest and Node's HTTP.
