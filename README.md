# Saga Orchestration Pivot + Retryable Demo

## Live UI
UI demo step-by-step orchestration with request/response timeline:
- Pivot transaction flow
- Retryable transaction flow (retry + exponential backoff)

## Run frontend locally
```bash
npm install
npm run dev
```

## Build frontend
```bash
npm run build
```

## C# runnable demo code
Folder: `csharp-demo/`

Run:
```bash
cd csharp-demo
dotnet run
```

Contains:
- `PivotSagaDemo.cs` (pivot transaction and forward recovery concept)
- `RetryableSagaDemo.cs` (retryable transaction with retry/backoff)
- `Program.cs` (entry point)
- `csharp-demo.csproj`
