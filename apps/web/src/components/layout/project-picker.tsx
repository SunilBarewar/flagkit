import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { NewProjectDialog } from "@/features/projects/components/new-project-dialog";
import { useCurrentProject } from "@/features/projects/project-context";
import { paths } from "@/routes/paths";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function ProjectAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground/70">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function ProjectPicker() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { project: selected, projects } = useCurrentProject();
  const selectedId = selected.id;
  const filtered = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2 text-sm font-semibold">
            <ProjectAvatar name={selected.name} />
            {selected.name}
            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 gap-0 p-0">
          <div className="p-2">
            <div className="flex h-9 items-center gap-2 rounded-lg border bg-muted/50 px-2.5">
              <Search className="size-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="px-2 pb-1">
            <p className="px-2 py-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Projects
            </p>
            {filtered.length === 0 && (
              <p className="px-2 py-2 text-sm text-muted-foreground">No projects found</p>
            )}
            {filtered.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  // A flag belongs to one project, so go to that project's list rather than stay on it.
                  if (project.id !== selectedId) navigate(paths.flags(project.id));
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent",
                  project.id === selectedId && "bg-accent",
                )}
              >
                <Check
                  className={cn("size-4", project.id === selectedId ? "opacity-100" : "opacity-0")}
                />
                <ProjectAvatar name={project.name} />
                {project.name}
              </button>
            ))}
          </div>
          <div className="border-t p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent"
            >
              <Plus className="size-4" />
              New project
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {creating && <NewProjectDialog onClose={() => setCreating(false)} />}
    </>
  );
}
