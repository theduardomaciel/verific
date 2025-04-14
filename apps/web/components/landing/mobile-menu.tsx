"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import Link from "next/link"

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-8 w-8">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-foreground">
              <path
                fill="currentColor"
                d="M18 4H6C4.89 4 4 4.89 4 6V18C4 19.11 4.89 20 6 20H18C19.11 20 20 19.11 20 18V6C20 4.89 19.11 4 18 4M18 18H6V6H8.5V8H15.5V6H18V18M11.5 12.5V10.5H9.5V12.5H11.5M14.5 12.5V10.5H12.5V12.5H14.5M11.5 15.5V13.5H9.5V15.5H11.5M14.5 15.5V13.5H12.5V15.5H14.5Z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold">verifIC</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
          <span className="sr-only">Close menu</span>
        </Button>
      </div>

      <nav className="flex flex-col px-8 py-16 space-y-12">
        <Link href="#" className="text-2xl font-medium">
          Sobre o projeto
        </Link>
        <Link href="#" className="text-2xl font-medium">
          Funcionalidades
        </Link>
        <Link href="#" className="text-2xl font-medium">
          FAQ
        </Link>

        <div className="mt-auto border rounded-md p-4 flex items-center gap-2 w-fit">
          <span>🇧🇷</span>
          <span className="font-medium">PT</span>
        </div>
      </nav>
    </div>
  )
}
