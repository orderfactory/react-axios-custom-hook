import { useAxios } from "../hooks/useAxios.ts";

export interface Forecast {
    date: string;
    temperatureC: number;
    temperatureF: number;
    summary: string;
}

/**
 * A domain Hook: it says what the page wants, not how it is fetched,
 * so the page does not change if useAxios gives way to a library.
 *
 * The demo API fails 70 percent of requests on purpose; `retries: 6`
 * allows seven attempts. Nothing is fetched until `fetchData` is called.
 */
export function useWeatherForecast() {
    return useAxios<Forecast[]>("/api/weatherforecast", {
        retries: 6,
        delay: 50,
        autoFetch: false,
    });
}
