import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginForm } from '@/components/app/login-form';
import { Logo } from '@/components/app/logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Clapperboard } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
            <Logo className="text-2xl"/>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your project dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
        <div className="mt-6 text-center">
            <Button asChild variant="link" className="text-muted-foreground">
                <Link href="/ad-experience?from=login">
                    <Clapperboard className="mr-2 h-4 w-4" />
                    Watch a Demo
                </Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
