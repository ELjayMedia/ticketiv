'use client';

import React from "react"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchInputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onSubmit?: (e: React.FormEvent) => void
  className?: string
}

export function SearchInput({
  placeholder = "Search...",
  value,
  onChange,
  onSubmit,
  className = "",
}: SearchInputProps) {
  return (
    <form onSubmit={onSubmit || ((e) => e.preventDefault())} className={`w-full ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 h-11 text-base"
          aria-label={placeholder}
        />
      </div>
    </form>
  )
}

export default SearchInput
