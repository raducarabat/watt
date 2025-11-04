import { Suspense } from "react";

import { LoginForm } from "@/app/(auth)/login/LoginForm";
import { Loader } from "@/components/Loader";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center">
          <Loader label="Preparing sign-in form" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
