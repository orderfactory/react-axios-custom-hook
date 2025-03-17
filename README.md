# react-axios-custom-hook
An example of custom React hook for enhancing Axios [React, JS, C#, .NET]

This project demonstrates how to build a custom React hook for making Axios requests with support for retries, delays, exponential back-off, caching, and dynamic parameters.

## Project Structure

- **ReactAxiosCustomHook.WebApi**: Backend API project providing weather forecast data with simulated failures.
- **ReactAxiosCustomHook.AppHost**: Application host project for running the backend and frontend together.
- **frontend**: Frontend React application using Vite.

## Getting Started

### Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) and npm

### Setup

1. Clone the repository:
    ```sh
    git clone https://github.com/orderfactory/react-axios-custom-hook.git
    cd react-axios-custom-hook
    ```

2. Start the .NET Aspire orchestration:
    ```sh
    dotnet run --project ReactAxiosCustomHook.AppHost
    ```

### Usage

The custom hook `useAxios` is used to fetch weather forecast data from the backend API.

#### Example Component

```tsx
import React from 'react';
import useAxios from "../hooks/useAxios.ts";

export interface Forecast {
    date: string;
    temperatureC: number;
    temperatureF: number;
    summary: string;
}

const WeatherForecast: React.FC = () => {
    const {data: forecasts, loading, fetchData} = useAxios<Forecast[]>(
        {method: "GET", url: `${import.meta.env.VITE_API_URL}/WeatherForecast`},
        {retries: 7, delay: 50, autoFetch: false, cacheEnabled: false}
    );

    function ForecastDisplay() {
        if (loading) return <p>Loading...</p>;
        return <table>
            <thead>
            <tr>
                <th>Date</th>
                <th>Temp. (C)</th>
                <th>Temp. (F)</th>
                <th>Summary</th>
            </tr>
            </thead>
            <tbody>
            {(
                forecasts ?? [
                    {
                        date: "N/A",
                        temperatureC: "",
                        temperatureF: "",
                        summary: "No forecasts",
                    },
                ]
            ).map((w) => {
                return (
                    <tr key={w.date}>
                        <td>{w.date}</td>
                        <td>{w.temperatureC}</td>
                        <td>{w.temperatureF}</td>
                        <td>{w.summary}</td>
                    </tr>
                );
            })}
            </tbody>
        </table>;
    }

    return (
        <div className="App">
            <header className="App-header">
                <h1>React (Vite) Weather</h1>
                <button onClick={() => fetchData()}>
                    Fetch Weather
                </button>
                {ForecastDisplay()}
            </header>
        </div>
    );
};

export default WeatherForecast;
```

### Custom Hook Implementation

The `useAxios` custom hook is implemented in `frontend/src/hooks/useAxios.ts`.

```typescript
// filepath: frontend/src/hooks/useAxios.ts
import {useState, useEffect, useCallback, useRef} from "react";
import axios, {AxiosRequestConfig} from "axios";

// ...existing code...

function useAxios<T>(
    config: AxiosRequestConfig,
    {
        retries = 5,
        delay = 1000,
        autoFetch = true,
        params: initialParams = {},
        cacheEnabled = false,
    }: UseAxiosOptions = {}
): UseAxiosResult<T> {
    // ...existing code...
}

export default useAxios;
```

### Configuration

The frontend configuration is defined in `frontend/package.json`.

```json
// filepath: frontend/package.json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.8.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.19.0",
    "@types/node": "^22.13.4",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-basic-ssl": "^1.2.0",
    "@vitejs/plugin-react-swc": "^3.8.0",
    "eslint": "^9.20.1",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^15.15.0",
    "typescript": "~5.7.2",
    "typescript-eslint": "^8.24.1",
    "vite": "^6.1.1"
  }
}
```

## Conclusion

This project demonstrates how to build a custom React hook for making Axios requests with advanced features like retries, delays, exponential back-off, caching, and dynamic parameters. Follow the setup instructions to run the project and see the custom hook in action.