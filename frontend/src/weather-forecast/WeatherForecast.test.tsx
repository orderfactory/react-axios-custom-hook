import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import WeatherForecast from "./WeatherForecast.tsx";

type Call = {
    url: string;
    options: { retries: number; delay: number };
    resolve: (data: unknown) => void;
    reject: (error: unknown) => void;
};

// The page's network, faked below the domain Hook: each call waits until the test answers it.
const calls = vi.hoisted(() => [] as Call[]);
vi.mock("../hooks/getWithRetry", () => ({
    getWithRetry: (url: string, options: Call["options"]) =>
        new Promise((resolve, reject) => calls.push({url, options, resolve, reject})),
}));

const forecast = {date: "2026-10-19", temperatureC: 20, temperatureF: 67, summary: "Mild"};

test("the page fetches on click and keeps the forecasts during a refetch", async () => {
    render(<WeatherForecast/>, {reactStrictMode: true});
    const button = screen.getByRole("button", {name: "Fetch Weather"});
    screen.getByText("No forecasts");
    expect(screen.queryByText("Loading...")).toBeNull();
    expect(calls).toHaveLength(0);

    fireEvent.click(button);
    screen.getByText("Loading...");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/weatherforecast");
    expect(calls[0].options).toMatchObject({retries: 6, delay: 50});

    await act(async () => calls[0].resolve([forecast]));
    expect(screen.queryByText("Loading...")).toBeNull();
    screen.getByText("Mild");

    fireEvent.click(button);
    screen.getByText("Loading...");
    screen.getByText("Mild");

    await act(async () => calls[1].reject(new Error("Request failed with status code 503")));
    expect(screen.getByRole("alert").textContent).toBe("Error: Request failed with status code 503");
    expect(screen.queryByText("Loading...")).toBeNull();
    screen.getByText("Mild");
});
