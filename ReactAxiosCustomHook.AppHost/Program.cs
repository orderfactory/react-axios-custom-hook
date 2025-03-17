var builder = DistributedApplication.CreateBuilder(args);

var weatherApi =
    builder.AddProject<Projects.ReactAxiosCustomHook_WebApi>("reactaxioscustomhook-webapi");

builder.AddNpmApp("frontend", "../frontend", "dev")
    .WithEnvironment("BROWSER", "none")
    .WithHttpEndpoint(env: "VITE_PORT")
    .WithEnvironment("VITE_API_URL", weatherApi.GetEndpoint("http"))
    ;

builder.Build().Run();
