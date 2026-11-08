import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/contexts/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();

  return <AuthForm mode="login" onSubmit={(_, email) => signIn(email)} />;
}
