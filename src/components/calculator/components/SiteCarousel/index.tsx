import { useRef } from 'react'
import { Plus } from 'lucide-react'
import { Site } from '../../types'
import { SiteCard } from '../SiteCard'

interface SiteCarouselProps {
  sites: Site[]
  currentSiteIndex: number
  onSiteChange: (index: number) => void
  onAddSite: () => void
  onUpdateSite: (siteIndex: number, updatedSite: Site) => void
  onDeleteSite: (siteIndex: number) => void
}

export const SiteCarousel = ({ 
  sites, 
  currentSiteIndex, 
  onSiteChange, 
  onAddSite,
  onUpdateSite,
  onDeleteSite
}: SiteCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null)

  const handleAddSite = () => {
    onAddSite()
    setTimeout(() => {
      if (carouselRef.current) {
        carouselRef.current.scrollTo({
          left: carouselRef.current.scrollWidth,
          behavior: 'smooth'
        })
      }
    }, 100)
  }

  const totalSitesResult = sites.reduce((total: number, site) => {
    return total + site.forms.reduce((formTotal: number, form) => {
      const result = parseFloat(form.result.replace('Total: ', '')) || 0
      return formTotal + result
    }, 0)
  }, 0).toFixed(1)

  return (
    <div className="relative w-full overflow-hidden mb-8">
      <div 
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
        role="region"
        aria-label="Sites carousel"
      >
        {sites.map((site, index) => (
          <div key={site.id} className="snap-start">
            <SiteCard
              site={site}
              isDefault={index === 0}
              onSelect={() => onSiteChange(index)}
              onUpdateSite={(updatedSite) => onUpdateSite(index, updatedSite)}
              onDeleteSite={() => onDeleteSite(index)}
            />
          </div>
        ))}
        <div className="snap-start">
          <button
            onClick={handleAddSite}
            className="flex-shrink-0 w-[280px] h-[200px] bg-white rounded-lg shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-4"
            aria-label="Add new site"
          >
            <div className="text-lg font-semibold text-gray-600">
              Total Sites: {totalSitesResult}
            </div>
            <Plus size={24} className="text-gray-400" />
            <span className="text-gray-600">Add New Site</span>
          </button>
        </div>
      </div>
    </div>
  )
} 