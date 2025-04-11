import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { EventCard } from "./EventCard"
import { CreateEventButton } from "./CreateEventButton"

const projects = [
  {
    id: 1,
    name: "SECOMP 2025",
    createdAt: "12/11/2024",
  },
  {
    id: 2,
    name: "Escola de Inverno 2024",
    createdAt: "09/06/2024",
  },
  {
    id: 3,
    name: "SECOMP 2024",
    createdAt: "08/11/2023",
  },
]

export function EventList() {
  return (
    <div className="w-full max-w-xl px-4">
      <h1 className="font-REM text-foreground text-2xl font-semibold text-center mb-6">Selecione um projeto</h1>

      <div className="bg-default rounded-lg p-4">
        <div className="space-y-3">
          {projects.map((project) => (
            <EventCard key={project.id} name={project.name} createdAt={project.createdAt} />
          ))}

          <CreateEventButton />

        </div>
      </div>
    </div>
  )
}

