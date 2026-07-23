import React, { useState } from 'react';
import { LockKeyhole, X } from 'lucide-react';

interface AuthFormProps {
  mode: 'login' | 'setup';
  onSubmit: (username: string, password: string) => Promise<void>;
  onCancel: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode, onSubmit, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSetup = mode === 'setup';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSetup && password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit(username, password);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 max-w-md mx-auto shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
      <div className="flex justify-between items-start mb-6">
        <div>
          <LockKeyhole size={24} className="text-primary mb-3" />
          <h2 className="text-2xl font-bold text-body">{isSetup ? 'Create your sign-in' : 'Editor sign-in'}</h2>
          <p className="text-sm text-muted mt-2">
            {isSetup ? 'Create the single account used to manage reviews.' : 'Sign in to add, edit, or delete reviews.'}
          </p>
        </div>
        <button type="button" onClick={onCancel} className="text-muted hover:text-body" aria-label="Close">
          <X size={22} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">Username</label>
          <input
            autoFocus
            required
            minLength={3}
            maxLength={128}
            autoComplete="username"
            value={username}
            onChange={event => setUsername(event.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">Password</label>
          <input
            required
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete={isSetup ? 'new-password' : 'current-password'}
            value={password}
            onChange={event => setPassword(event.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {isSetup && <p className="text-xs text-muted mt-1">Use at least 12 characters.</p>}
        </div>
        {isSetup && (
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">Confirm password</label>
            <input
              required
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-primary text-white rounded-xl hover:bg-indigo-500 disabled:opacity-60 font-bold shadow-lg shadow-primary/25"
        >
          {isSubmitting ? 'Please wait…' : isSetup ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};
