import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, sending, sent, error
  const [message, setMessage] = useState('');
  const [devUrl, setDevUrl] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setMessage('');

    try {
      const data = await login(email);
      setStatus('sent');
      setMessage(data.message);

      // In dev mode, show the magic link URL
      if (data.devUrl) {
        setDevUrl(data.devUrl);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Failed to send magic link');
    }
  };

  // For development: handle clicking the dev link
  const handleDevLink = () => {
    if (devUrl) {
      const url = new URL(devUrl);
      const token = url.searchParams.get('token');
      navigate(`/auth/verify?token=${token}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Calendar className="h-12 w-12 text-blue-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Timeline Planner
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your team's timelines
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === 'sent' ? (
            <div className="text-center">
              <div className="text-green-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Check your email</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>

              {devUrl && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                  <p className="text-xs text-yellow-800 mb-2">Dev mode: Click below to sign in</p>
                  <button
                    onClick={handleDevLink}
                    className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
                  >
                    Sign in (dev link)
                  </button>
                </div>
              )}

              <button
                onClick={() => { setStatus('idle'); setEmail(''); setDevUrl(''); }}
                className="mt-4 text-sm text-blue-600 hover:text-blue-500"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {status === 'error' && (
                <div className="text-sm text-red-600">
                  {message}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'sending' ? 'Sending...' : 'Send magic link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
