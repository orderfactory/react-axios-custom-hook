import { useWeatherForecast } from "./useWeatherForecast.ts";

function WeatherForecast() {
    const {data: forecasts, loading, error, fetchData} = useWeatherForecast();

    return (
        <div className="App">
            <header className="App-header">
                <h1>React (Vite) Weather</h1>
                <button onClick={fetchData}>
                    Fetch Weather
                </button>
                {loading && <p>Loading...</p>}
                {error && <p role="alert">Error: {error.message}</p>}
                {/* A refetch keeps the last forecasts on screen until new ones arrive. */}
                <table>
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Temp. (C)</th>
                        <th>Temp. (F)</th>
                        <th>Summary</th>
                    </tr>
                    </thead>
                    <tbody>
                    {forecasts ? (
                        forecasts.map((w) => (
                            <tr key={w.date}>
                                <td>{w.date}</td>
                                <td>{w.temperatureC}</td>
                                <td>{w.temperatureF}</td>
                                <td>{w.summary}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td>N/A</td>
                            <td></td>
                            <td></td>
                            <td>No forecasts</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </header>
        </div>
    );
}

export default WeatherForecast;
