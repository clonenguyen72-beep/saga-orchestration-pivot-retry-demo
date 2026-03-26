using System;
using System.Threading.Tasks;

public static class RetryHelper
{
    public static async Task<bool> ExecuteWithRetryAsync(Func<Task<bool>> action, int maxAttempts = 5, int baseDelayMs = 200)
    {
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                if (await action()) return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Attempt {attempt} exception: {ex.Message}");
            }

            if (attempt < maxAttempts)
            {
                int delay = baseDelayMs * (int)Math.Pow(2, attempt - 1);
                Console.WriteLine($"Retry in {delay} ms...");
                await Task.Delay(delay);
            }
        }
        return false;
    }
}

public class RetryableSagaDemo
{
    public static async Task RunAsync()
    {
        int count = 0;
        bool ok = await RetryHelper.ExecuteWithRetryAsync(async () =>
        {
            count++;
            Console.WriteLine($"Call shipping #{count}");
            await Task.Delay(50);
            if (count < 3) throw new TimeoutException("Gateway timeout");
            return true;
        });

        Console.WriteLine(ok ? "Shipping success after retries" : "Shipping failed after max retries");
    }
}
