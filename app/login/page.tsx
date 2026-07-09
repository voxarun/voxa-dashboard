import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <div
            className="h-8 w-8 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #0050cc, #0094ff, #00e5ff)",
              clipPath: "polygon(50% 0%, 100% 28%, 82% 100%, 50% 76%, 18% 100%, 0% 28%)",
            }}
          />
          <span className="text-lg font-extrabold tracking-tight">Voxa Dashboard</span>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
