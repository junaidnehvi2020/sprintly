'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const { login, signup } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('manager@sprintly.app');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (loginError: any) {
      if (loginError.code === 'auth/user-not-found') {
        // If login fails because the user doesn't exist, try creating a new account.
        try {
          await signup(email, password);
          toast({
            title: 'Account Created',
            description: "We've created a new account for you.",
          });
          router.push('/dashboard');
        } catch (signupError: any) {
          setError('Failed to create an account. Please try again.');
          toast({
            title: 'Sign Up Failed',
            description: signupError.message,
            variant: 'destructive',
          });
          console.error(signupError);
        }
      } else if (loginError.code === 'auth/invalid-credential' || loginError.code === 'auth/wrong-password') {
         setError('Invalid credentials. Please check your email and password.');
         toast({
          title: 'Login Failed',
          description: 'Invalid credentials. Please check your email and password.',
          variant: 'destructive',
        });
      } else {
        setError('An unexpected error occurred during login.');
        toast({
          title: 'Login Failed',
          description: loginError.message,
          variant: 'destructive',
        });
        console.error(loginError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input 
            id="password" 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
        />
      </div>
       {error && <p className="text-sm text-destructive">{error}</p>}
       <div className="text-xs text-muted-foreground">
          Use the default credentials or enter new ones to sign up.
        </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In or Sign Up'}
      </Button>
    </form>
  );
}
