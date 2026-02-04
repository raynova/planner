import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [error, setError] = useState('');
  const { verifyToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('No token provided');
      return;
    }

    verifyToken(token)
      .then(() => {
        setStatus('success');
        // Redirect to dashboard after short delay
        setTimeout(() => {
          navigate('/');
        }, 1500);
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message || 'Invalid or expired link');
      });
  }, [searchParams, verifyToken, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          {status === 'verifying' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Verifying your link...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-green-500 mx-auto">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Signed in!</h3>
              <p className="mt-2 text-sm text-gray-600">Redirecting to your timelines...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-red-500 mx-auto">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Verification failed</h3>
              <p className="mt-2 text-sm text-red-600">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
