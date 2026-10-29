import { AuthModal } from "@/components/auth-modal";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <AuthModal path="/auth/login" label="Log in">
      <LoginForm />
    </AuthModal>
  );
}
