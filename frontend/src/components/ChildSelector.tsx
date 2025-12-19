'use client'

interface Child {
  id: string
  name: string
}

interface ChildSelectorProps {
  children: Child[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  multiSelect?: boolean
}

export default function ChildSelector({ children, selectedIds, onChange, multiSelect = true }: ChildSelectorProps) {
  const colorMap = [
    { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-600', activeBg: 'bg-pink-600' },
    { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-600', activeBg: 'bg-purple-600' },
    { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-600', activeBg: 'bg-green-600' },
    { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-600', activeBg: 'bg-yellow-600' },
    { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-600', activeBg: 'bg-indigo-600' },
    { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-600', activeBg: 'bg-red-600' }
  ]

  const handleToggle = (childId: string) => {
    if (multiSelect) {
      // Multi-select mode
      if (selectedIds.includes(childId)) {
        // Remove if already selected
        onChange(selectedIds.filter(id => id !== childId))
      } else {
        // Add to selection
        onChange([...selectedIds, childId])
      }
    } else {
      // Single-select mode
      onChange([childId])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {children.map((child, index) => {
        const isSelected = selectedIds.includes(child.id)
        const colors = colorMap[index % colorMap.length]

        return (
          <button
            key={child.id}
            type="button"
            onClick={() => handleToggle(child.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border-2 ${
              isSelected
                ? `${colors.activeBg} text-white ${colors.border}`
                : `${colors.bg} ${colors.text} ${colors.border} border-opacity-0 hover:border-opacity-100`
            }`}
          >
            {child.name}
          </button>
        )
      })}
    </div>
  )
}
