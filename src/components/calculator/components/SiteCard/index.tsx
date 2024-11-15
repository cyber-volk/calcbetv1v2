import { useState, useEffect } from 'react'
import { Check, X, Edit2, Palette, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Site, SiteColor } from '../../types'
import { SITE_COLORS } from '../../constants'

interface SiteCardProps {
  site: Site
  isDefault?: boolean
  onSelect: (siteId: string) => void
  onUpdateSite: (updatedSite: Site) => void
  onDeleteSite: () => void
}

export const SiteCard = ({ 
  site, 
  isDefault = false, 
  onSelect, 
  onUpdateSite,
  onDeleteSite 
}: SiteCardProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(site.name)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setEditedName(site.name)
  }, [site.name])

  return (
    <div 
      className={`
        relative flex-shrink-0 w-[280px] p-4 rounded-lg shadow-lg
        transition-all duration-300 hover:shadow-xl cursor-pointer
        ${SITE_COLORS[site.color || 'none'].bg}
      `}
    >
      <div className="flex justify-between items-start mb-4">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="px-2 py-1 border rounded"
              autoFocus
            />
            <button 
              onClick={() => {
                if (editedName.trim()) {
                  onUpdateSite({ ...site, name: editedName.trim() })
                  setIsEditing(false)
                }
              }} 
              className="text-green-500 hover:text-green-700"
              aria-label="Save site name"
            >
              <Check size={20} />
            </button>
            <button 
              onClick={() => {
                setEditedName(site.name)
                setIsEditing(false)
              }} 
              className="text-red-500 hover:text-red-700"
              aria-label="Cancel editing"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold">{site.name}</h3>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Edit site name"
            >
              <Edit2 size={16} />
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowColorPicker(!showColorPicker)
                }}
                className="text-gray-400 hover:text-gray-600 ml-2"
                aria-label="Change site color"
                aria-expanded={showColorPicker}
              >
                <Palette size={16} />
              </button>
              
              {showColorPicker && (
                <div 
                  className="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-lg z-50 flex gap-2"
                  role="dialog"
                  aria-label="Color picker"
                >
                  {Object.entries(SITE_COLORS).map(([color, styles]) => (
                    <button
                      key={color}
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateSite({ ...site, color: color as SiteColor })
                        setShowColorPicker(false)
                      }}
                      className={`w-8 h-8 rounded-full ${styles.bg} ${styles.hover} border-2 border-gray-200 transition-all duration-200 transform hover:scale-110
                        ${site.color === color ? 'ring-2 ring-offset-2 ' + styles.ring : ''}
                      `}
                      aria-label={`Select ${color} color`}
                      aria-selected={site.color === color}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {!isDefault && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteConfirm(true)
            }}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Delete site"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div 
        onClick={() => onSelect(site.id)}
        className="space-y-2"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onSelect(site.id)
          }
        }}
      >
        <p>Forms: {site.forms.length}</p>
        <p className="font-semibold">
          Total: {site.forms.reduce((total, form) => {
            const result = parseFloat(form.result.replace('Total: ', '')) || 0
            return total + result
          }, 0).toFixed(1)}
        </p>
        <p className="text-sm text-gray-500">
          Updated {formatDistanceToNow(new Date(site.statistics.lastUpdated), { addSuffix: true })}
        </p>
      </div>

      {showDeleteConfirm && (
        <div 
          className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center rounded-lg p-4"
          role="alertdialog"
          aria-labelledby="delete-dialog-title"
        >
          <p id="delete-dialog-title" className="text-center mb-4">Are you sure you want to delete this site?</p>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteSite()
                setShowDeleteConfirm(false)
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(false)
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 