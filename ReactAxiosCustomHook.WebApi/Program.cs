using Microsoft.AspNetCore.Http.HttpResults;
using ReactAxiosCustomHook.WebApi;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

string[] summaries = ["Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"];

var api = app.MapGroup("/api");
api.MapGet("weatherforecast", async Task<Results<Ok<WeatherForecast[]>, ProblemHttpResult>> (
        ILogger<Program> logger, CancellationToken cancellationToken) =>
    {
        logger.LogInformation("GetWeatherForecast method started.");

        // Simulate a slow response with a half-second delay; a client that gives up ends it early
        await Task.Delay(500, cancellationToken);

        // 30% chance to succeed
        if (Random.Shared.NextDouble() <= 0.3)
        {
            var forecasts = Enumerable.Range(1, 5).Select(index =>
                    new WeatherForecast
                    (
                        DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                        Random.Shared.Next(-20, 55),
                        summaries[Random.Shared.Next(summaries.Length)]
                    ))
                .ToArray();

            logger.LogInformation("GetWeatherForecast method succeeded.");
            return TypedResults.Ok(forecasts);
        }

        // 70% chance to return 503 Service Unavailable
        logger.LogWarning("GetWeatherForecast method failed with 503 Service Unavailable.");
        return TypedResults.Problem(statusCode: StatusCodes.Status503ServiceUnavailable);
    })
    .WithName("GetWeatherForecast")
    .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

app.MapDefaultEndpoints();

// Serves the built React app, which the published container holds in wwwroot
app.UseFileServer();

app.Run();
