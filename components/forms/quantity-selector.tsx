interface QuantitySelectorProps {
  quantity: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export function QuantitySelector({ quantity, onChange, min = 1, max = 10 }: QuantitySelectorProps) {
  const clamp = (value: number) => Math.min(max, Math.max(min, value))

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(clamp(quantity - 1))}
        className="rounded border px-3 py-1 transition hover:bg-muted"
      >
        −
      </button>
      <input
        type="number"
        value={quantity}
        onChange={(event) => onChange(clamp(Number.parseInt(event.target.value) || min))}
        className="w-12 rounded border text-center"
        min={min}
        max={max}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(quantity + 1))}
        className="rounded border px-3 py-1 transition hover:bg-muted"
      >
        +
      </button>
    </div>
  )
}
