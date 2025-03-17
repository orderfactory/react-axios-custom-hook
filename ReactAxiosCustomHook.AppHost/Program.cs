var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.ReactAxiosCustomHook_WebApi>("reactaxioscustomhook-webapi");

builder.Build().Run();
