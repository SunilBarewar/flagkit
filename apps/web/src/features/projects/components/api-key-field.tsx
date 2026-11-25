import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** A read-only API key with a copy button. */
export function ApiKeyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the key is selectable in the field.
    }
  };

  return (
    <div className="flex gap-3">
      <Input
        readOnly
        value={value}
        aria-label="API key"
        onFocus={(e) => e.currentTarget.select()}
        className="h-9 font-mono text-xs"
      />
      <Button type="button" variant="outline" className="h-9" onClick={copy}>
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}
