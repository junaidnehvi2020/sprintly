'use client';
import { AccessControlManagement } from '@/components/app/access-control-management';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AccessControlPage() {
  const { role, isRoleLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isRoleLoading && role !== 'Admin') {
      router.replace('/dashboard');
    }
  }, [role, isRoleLoading, router]);

  if (isRoleLoading || role !== 'Admin') {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }
  
  return <AccessControlManagement />;
}
