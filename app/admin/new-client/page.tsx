import { NewClientForm } from "./NewClientForm";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-extrabold">Add New Client</h1>
      <NewClientForm />
    </div>
  );
}
