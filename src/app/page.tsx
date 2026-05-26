'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center space-y-4">
        <p className="text-lg text-gray-600">
          Hey, {user.name}.
        </p>

        <Button variant="outline" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
