var builder = DistributedApplication.CreateBuilder(args);

// `aspire deploy` builds the container images and starts them with Docker Compose.
builder.AddDockerComposeEnvironment("compose");

var webapi = builder.AddProject<Projects.ReactAxiosCustomHook_WebApi>("webapi")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

// In development, Vite serves the React app and proxies /api to the web API.
var frontend = builder.AddViteApp("frontend", "../frontend")
    .WithReference(webapi)
    .WaitFor(webapi);

// When published, the web API serves the built React app from wwwroot.
webapi.PublishWithContainerFiles(frontend, "wwwroot");

builder.Build().Run();
