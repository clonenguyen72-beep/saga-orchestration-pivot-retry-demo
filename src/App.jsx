import { useMemo, useState } from 'react'
import './App.css'

const pivotCode = `public async Task<SagaExecutionResult> ExecuteWithPivotAsync(SagaContext context)
{
    var completed = new Stack<ISagaStep>();
    bool pivotPassed = false;

    foreach (var step in _steps)
    {
        var ok = await step.ExecuteAsync(context);
        if (!ok)
        {
            if (!pivotPassed)
            {
                while (completed.Count > 0)
                    await completed.Pop().CompensateAsync(context);
            }
            else
            {
                // Forward recovery: queue manual action / retry downstream
                await _recoveryService.HandleAfterPivotFailureAsync(context);
            }
            return SagaExecutionResult.Failed(step.StepName);
        }

        if (step.Type == StepType.Compensatable)
            completed.Push(step);

        if (step.Type == StepType.Pivot)
            pivotPassed = true;
    }

    return SagaExecutionResult.Success();
}`

const retryableCode = `public static async Task<bool> ExecuteWithRetryAsync(
    Func<Task<bool>> action,
    int maxAttempts = 5,
    int baseDelayMs = 300)
{
    for (int attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            if (await action()) return true;
        }
        catch { /* log */ }

        if (attempt < maxAttempts)
        {
            var delay = baseDelayMs * (int)Math.Pow(2, attempt - 1);
            await Task.Delay(delay); // exponential backoff
        }
    }
    return false;
}`

function createEventBuilder() {
  const base = Date.now()
  let seq = 0

  return function build(step, kind, request, response) {
    seq += 1
    const t = new Date(base + seq * 900) // mỗi step lệch 900ms cho dễ nhìn
    return {
      order: seq,
      time: `${t.toLocaleTimeString()}.${String(t.getMilliseconds()).padStart(3, '0')}`,
      step,
      kind,
      request,
      response,
    }
  }
}

function simulatePivotDemo() {
  const events = []
  const event = createEventBuilder()

  events.push(event('CreateOrder', 'ExecuteRequest', { action: 'POST /orders' }))
  events.push(event('CreateOrder', 'ExecuteResponse', null, { ok: true, status: 201 }))

  events.push(event('ReserveInventory', 'ExecuteRequest', { action: 'POST /inventory/reserve' }))
  events.push(event('ReserveInventory', 'ExecuteResponse', null, { ok: true, status: 200 }))

  events.push(event('ChargePayment (PIVOT)', 'ExecuteRequest', { action: 'POST /payments/charge' }))
  events.push(event('ChargePayment (PIVOT)', 'ExecuteResponse', null, { ok: true, status: 200 }))

  events.push(event('ArrangeShipping', 'ExecuteRequest', { action: 'POST /shipping/arrange' }))
  events.push(event('ArrangeShipping', 'ExecuteResponse', null, { ok: false, status: 503, message: 'No driver available' }))

  events.push(event('ForwardRecovery', 'Action', { action: 'Queue manual shipping retry' }, { ok: true }))

  return {
    title: 'Pivot Demo (Fail sau Pivot)',
    summary: 'Shipping fail sau khi payment (pivot) đã thành công => KHÔNG rollback full, chuyển forward recovery.',
    events,
  }
}

function simulateRetryableDemo() {
  const events = []
  const event = createEventBuilder()

  events.push(event('CreateOrder', 'ExecuteRequest', { action: 'POST /orders' }))
  events.push(event('CreateOrder', 'ExecuteResponse', null, { ok: true, status: 201 }))

  for (let i = 1; i <= 3; i++) {
    events.push(event('ArrangeShipping (Retryable)', `RetryAttempt #${i}`, { action: 'POST /shipping/arrange' }))
    if (i < 3) {
      events.push(event('ArrangeShipping (Retryable)', 'ExecuteResponse', null, { ok: false, status: 504, message: 'Gateway timeout' }))
    } else {
      events.push(event('ArrangeShipping (Retryable)', 'ExecuteResponse', null, { ok: true, status: 200, shipmentId: 'SHIP-AX92' }))
    }
  }

  return {
    title: 'Retryable Demo (Retry + Backoff)',
    summary: 'Shipping timeout 2 lần đầu, thành công lần 3 => saga vẫn hoàn tất.',
    events,
  }
}

function App() {
  const [result, setResult] = useState(null)
  const [tab, setTab] = useState('pivot')

  const code = useMemo(() => (tab === 'pivot' ? pivotCode : retryableCode), [tab])

  return (
    <div className="page">
      <h1>Saga Pattern Orchestration Demo</h1>
      <p className="subtitle">UI demo step-by-step Request/Response + orchestration flow (pivot & retryable)</p>

      <div className="actions">
        <button onClick={() => { setTab('pivot'); setResult(simulatePivotDemo()) }}>Run Pivot Demo</button>
        <button onClick={() => { setTab('retry'); setResult(simulateRetryableDemo()) }}>Run Retryable Demo</button>
      </div>

      <section className="panel">
        <h2>{tab === 'pivot' ? 'C# Demo Code: Pivot Transaction' : 'C# Demo Code: Retryable Transaction'}</h2>
        <pre><code>{code}</code></pre>
      </section>

      {result && (
        <section className="panel">
          <h2>{result.title}</h2>
          <p>{result.summary}</p>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Time</th>
                <th>Step</th>
                <th>Kind</th>
                <th>Request</th>
                <th>Response</th>
              </tr>
            </thead>
            <tbody>
              {result.events.map((e, idx) => (
                <tr key={idx}>
                  <td>{e.order}</td>
                  <td>{e.time}</td>
                  <td>{e.step}</td>
                  <td>{e.kind}</td>
                  <td>{e.request ? JSON.stringify(e.request) : '-'}</td>
                  <td>{e.response ? JSON.stringify(e.response) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

export default App