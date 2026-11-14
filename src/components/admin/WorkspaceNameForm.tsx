"use client";

import { useState, type FormEvent } from "react";
import { useOffice } from "@/lib/data/react";
import { WORKSPACE_NAME_MAX } from "@/lib/data/rules";
import { Button, Card, Field, FormMessage, inputClass } from "@/components/ui/controls";

export function WorkspaceNameForm() {
  const { state, actions } = useOffice();
  const [name, setName] = useState(state.workspace.name);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await actions.renameWorkspace(name);
    setMessage(
      result.ok ? { tone: "success", text: "Workspace renamed." } : { tone: "error", text: result.error },
    );
  };

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-xl font-semibold text-ink">Workspace</h2>
      <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-3">
        <Field label="Name" htmlFor="workspace-name">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="workspace-name"
              type="text"
              value={name}
              maxLength={WORKSPACE_NAME_MAX}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
            <Button type="submit" variant="secondary" className="shrink-0">
              Save name
            </Button>
          </div>
        </Field>
        {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
      </form>
    </Card>
  );
}
