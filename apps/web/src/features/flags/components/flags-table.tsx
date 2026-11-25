import type { FlagResponse } from "@flagkit/shared/schemas";
import { Pencil } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { paths } from "@/routes/paths";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

interface FlagsTableProps {
  flags: FlagResponse[];
  onToggle: (flagId: string, enabled: boolean) => void;
  isToggling: (flagId: string) => boolean;
}

export function FlagsTable({ flags, onToggle, isToggling }: FlagsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-3">
              Flag
            </th>
            <th scope="col" className="w-px whitespace-nowrap px-5 py-3">
              Type
            </th>
            <th scope="col" className="w-px whitespace-nowrap px-5 py-3">
              Created
            </th>
            <th scope="col" className="w-px whitespace-nowrap px-5 py-3 text-right">
              Enabled
            </th>
            <th scope="col" className="w-px whitespace-nowrap px-5 py-3 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {flags.map((flag) => (
            <tr key={flag.id} className="hover:bg-muted/30">
              <td className="px-5 py-3">
                <Link
                  to={paths.flag(flag.id)}
                  className="block max-w-md truncate font-mono font-medium hover:underline"
                >
                  {flag.key}
                </Link>
                {flag.description && (
                  <p className="line-clamp-2 max-w-md text-muted-foreground">{flag.description}</p>
                )}
              </td>
              <td className="whitespace-nowrap px-5 py-3">
                <Badge variant="secondary" className="capitalize">
                  {flag.type}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                <time dateTime={flag.createdAt}>{dateFormat.format(new Date(flag.createdAt))}</time>
              </td>
              <td className="whitespace-nowrap px-5 py-3">
                <div className="flex justify-end">
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(enabled) => onToggle(flag.id, enabled)}
                    disabled={isToggling(flag.id)}
                    aria-label={`${flag.enabled ? "Disable" : "Enable"} ${flag.key}`}
                  />
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-3">
                <div className="flex justify-end">
                  <Button asChild variant="outline" size="sm">
                    <Link to={paths.flag(flag.id)} aria-label={`Edit ${flag.key}`}>
                      <Pencil /> Edit
                    </Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
