export const globalNavigation = {
  scrollToSection: (href: string, sectionId?: string) => {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      if (sectionId) {
        window.dispatchEvent(new CustomEvent("section-nav-activate", { 
          detail: { sectionId } 
        }))
      }
    }
  },
  
  // Trigger navigation from anywhere
  triggerNavigation: (sectionId: string) => {
    const href = `#${sectionId}`
    globalNavigation.scrollToSection(href, sectionId)
  }
} 