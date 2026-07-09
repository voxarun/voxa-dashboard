import { NewClientForm } from "./NewClientForm";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-extrabold">Add New Client</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--t2)" }}>
        No code, no deploy — this goes live immediately.
      </p>
      <NewClientForm />
    </div>
  );
}
