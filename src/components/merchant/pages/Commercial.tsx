import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../../firebase';

type CommercialState = {
  planId: string;
  subscriptionState: string;
  entitlements: Record<string, boolean>;
};

export function Commercial() {
  const [state, setState] = useState<CommercialState | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const restaurantId = auth.currentUser?.getIdTokenResult ? (await auth.currentUser.getIdTokenResult()).claims.restaurantId : undefined;
      if (typeof restaurantId !== 'string' || !restaurantId) {
        if (mounted) { setMessage('Restaurant identity is unavailable.'); setLoading(false); }
        return;
      }
      try {
        const call = httpsCallable<{ restaurantId: string }, CommercialState>(functions, 'getCommercialState');
        const result = await call({ restaurantId });
        if (mounted) setState(result.data);
      } catch {
        if (mounted) setMessage('Unable to load commercial status.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const requestChange = async (requestedPlanId: string) => {
    const restaurantId = auth.currentUser ? (await auth.currentUser.getIdTokenResult()).claims.restaurantId : undefined;
    if (typeof restaurantId !== 'string' || !restaurantId) return;
    try {
      const call = httpsCallable(functions, 'requestCommercialChange');
      await call({ restaurantId, requestedPlanId });
      setMessage('Plan change request submitted.');
    } catch {
      setMessage('Unable to submit the request.');
    }
  };

  if (loading) return <div className="p-6">Loading commercial status…</div>;
  if (!state) return <div className="p-6">{message || 'Commercial status unavailable.'}</div>;

  return (
    <section className="space-y-6 p-6" aria-labelledby="commercial-title">
      <div>
        <h1 id="commercial-title" className="text-2xl font-semibold">Plan & account</h1>
        <p className="mt-1 text-sm text-gray-600">Commercial access is controlled by the server.</p>
      </div>
      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Current plan</p>
            <p className="text-xl font-semibold">{state.planId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Subscription</p>
            <p className="font-medium">{state.subscriptionState}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Enabled capabilities</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {Object.entries(state.entitlements).map(([name, enabled]) => (
            <div key={name} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span>{name}</span><span>{enabled ? 'Enabled' : 'Not included'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Plan change</h2>
        <p className="mt-1 text-sm text-gray-600">Requests do not change access immediately; an authorized commercial operator must approve them.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {['starter', 'growth'].filter(plan => plan !== state.planId).map(plan => (
            <button key={plan} type="button" onClick={() => requestChange(plan)} className="rounded-lg border px-4 py-2 font-medium">
              Request {plan}
            </button>
          ))}
        </div>
      </div>
      {message && <p role="status" className="text-sm">{message}</p>}
    </section>
  );
}
