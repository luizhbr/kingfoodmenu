import { useState } from 'react';

/**
 * Public account-deletion page — the URL declared in Google Play's Data
 * safety form (and linked from the app stores). Signed-in users are told
 * to use the in-app deletion; everyone else can file a request that is
 * emailed to the operator via POST /api/customers/deletion-request.
 */
export default function DeleteAccount() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/customers/deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message: message || undefined }),
      });
      setState(res.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Delete your account</h1>

      <div className="prose prose-gray max-w-none mb-10">
        <p>
          You can delete your Inka account and the personal data associated with it at any
          time. Deletion removes your profile (name, email, phone), saved delivery addresses
          and food preferences. Order and invoice records that we are legally required to
          keep for tax purposes (§ 147 AO) are retained in anonymised form — they can no
          longer be linked to you.
        </p>
        <p>
          <strong>Fastest way — in the app:</strong> open <em>Profile → Delete account</em>.
          Deletion is immediate.
        </p>
        <p>
          <strong>No access to the app anymore?</strong> Use the form below. We will verify
          that you control the registered email address and process the deletion within 30
          days, as required by the GDPR.
        </p>
      </div>

      {state === 'sent' ? (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
          Your request has been received. We will contact you at the address you provided to
          confirm the deletion.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address of your account
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message (optional)
            </label>
            <textarea
              id="message"
              rows={3}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {state === 'error' && (
            <p className="text-sm text-red-600">
              Something went wrong — please try again or email us directly.
            </p>
          )}
          <button
            type="submit"
            disabled={state === 'sending'}
            className="rounded-lg bg-gray-900 text-white px-5 py-2.5 font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {state === 'sending' ? 'Sending…' : 'Request deletion'}
          </button>
        </form>
      )}
    </div>
  );
}
