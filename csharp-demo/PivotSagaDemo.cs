using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public enum StepType { Compensatable, Pivot, Retryable }

public class Step
{
    public string Name { get; init; } = "";
    public StepType Type { get; init; }
    public Func<Task<bool>> Execute { get; init; } = default!;
    public Func<Task>? Compensate { get; init; }
}

public class PivotSagaDemo
{
    public static async Task RunAsync()
    {
        var steps = new List<Step>
        {
            new() { Name = "CreateOrder", Type = StepType.Compensatable, Execute = async () => { await Task.Delay(50); return true; }, Compensate = async () => { await Task.Delay(20); Console.WriteLine("[COMP] CreateOrder"); } },
            new() { Name = "ReserveInventory", Type = StepType.Compensatable, Execute = async () => { await Task.Delay(50); return true; }, Compensate = async () => { await Task.Delay(20); Console.WriteLine("[COMP] ReserveInventory"); } },
            new() { Name = "ChargePayment", Type = StepType.Pivot, Execute = async () => { await Task.Delay(50); return true; } },
            new() { Name = "ArrangeShipping", Type = StepType.Retryable, Execute = async () => { await Task.Delay(50); return false; } },
        };

        var completed = new Stack<Step>();
        bool pivotPassed = false;

        foreach (var s in steps)
        {
            var ok = await s.Execute();
            Console.WriteLine($"[EXEC] {s.Name} => {(ok ? "OK" : "FAIL")}");

            if (!ok)
            {
                if (!pivotPassed)
                {
                    while (completed.Count > 0)
                    {
                        var done = completed.Pop();
                        if (done.Compensate != null) await done.Compensate();
                    }
                }
                else
                {
                    Console.WriteLine("[FORWARD] Pivot da qua => queue xu ly tiep/manual");
                }
                return;
            }

            if (s.Type == StepType.Compensatable) completed.Push(s);
            if (s.Type == StepType.Pivot) pivotPassed = true;
        }

        Console.WriteLine("Saga success");
    }
}
