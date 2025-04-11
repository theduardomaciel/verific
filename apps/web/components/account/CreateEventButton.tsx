"use client";

import { Plus } from "lucide-react"; // Certifique-se de que você tem o pacote 'lucide-react' instalado
import { Button } from "@/components/ui/button"; // Ajuste o caminho conforme necessário

export function CreateEventButton() {
  return (
    <Button className="w-full py-6 bg-primary hover:bg-blue-600 text-white flex items-center justify-center gap-2">
      <Plus className="font-hanken font-medium text-base leading-6 tracking-normal align-middle" />
      Criar novo projeto
    </Button>
  );
}
