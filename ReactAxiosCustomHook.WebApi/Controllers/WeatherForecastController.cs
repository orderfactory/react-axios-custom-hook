using Microsoft.AspNetCore.Mvc;

namespace ReactAxiosCustomHook.WebApi.Controllers;

[ApiController]
[Route("[controller]")]
public class WeatherForecastController(ILogger<WeatherForecastController> logger) : ControllerBase
{
    private static readonly string[] Summaries =
    [
        "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
    ];

    [HttpGet(Name = "GetWeatherForecast")]
    public async Task<IActionResult> Get()
    {
        logger.LogInformation("GetWeatherForecast method started.");

        // Simulate a slow response with a half-second delay
        await Task.Delay(500);

        // Generate a random number between 0 and 1
        var random = new Random();
        var chance = random.NextDouble();

        // 30% chance to succeed
        if (chance <= 0.3)
        {
            var forecasts = Enumerable.Range(1, 5).Select(index => new WeatherForecast
                {
                    Date = DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                    TemperatureC = Random.Shared.Next(-20, 55),
                    Summary = Summaries[Random.Shared.Next(Summaries.Length)]
                })
                .ToArray();

            logger.LogInformation("GetWeatherForecast method succeeded.");
            return Ok(forecasts);
        }

        // 70% chance to return 503 Service Unavailable
        logger.LogWarning("GetWeatherForecast method failed with 503 Service Unavailable.");
        return StatusCode(StatusCodes.Status503ServiceUnavailable, "Service Unavailable");
    }
}