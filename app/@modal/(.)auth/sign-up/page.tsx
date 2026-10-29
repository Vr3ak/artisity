import { AuthModal } from "@/components/auth-modal";
import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <AuthModal path="/auth/sign-up" label="Sign up">
      <SignUpForm />
    </AuthModal>
  );
}
