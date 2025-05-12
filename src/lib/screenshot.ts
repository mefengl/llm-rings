import html2canvas from 'html2canvas'

export async function exportPopupAsPng() {
  // Find the root element and the button
  const root = document.getElementById('root')
  const exportButton = document.getElementById('export-button')
  // Get the edit nickname button
  const editButton = document.getElementById('edit-nickname-button')

  if (!root) {
    console.error('Root element not found for screenshot.')
    return
  }

  // 1. Dynamically insert the date
  const tag = document.createElement('div')
  tag.textContent = new Date().toLocaleDateString()
  Object.assign(tag.style, {
    bottom: '4px',
    color: '#666', // Subtle gray color
    fontSize: '10px',
    pointerEvents: 'none', // Ensure it doesn't interfere with clicks
    position: 'absolute',
    right: '6px',
    zIndex: '9999', // Make sure it's on top
  })
  root.style.position = 'relative' // Ensure positioning context
  root.appendChild(tag)

  // --- Temporarily hide buttons ---
  const hide = (el: HTMLElement | null): (() => void) => {
    if (!el)
      return () => {}
    const originalDisplay = el.style.display
    el.style.display = 'none'
    return () => {
      el.style.display = originalDisplay
    }
  }

  const restoreExportButton = hide(exportButton)
  const restoreEditButton = hide(editButton) // Hide the edit button too
  // --- End hiding buttons ---

  try {
    // 2. Take the screenshot
    const canvas = await html2canvas(root, {
      backgroundColor: null, // Use transparent background
      // No need for ignoreElements since we manually hide them
      logging: false, // Disable verbose logging
      useCORS: true, // Enable CORS for potential external resources
    })

    // 3. Trigger the download
    const link = document.createElement('a')
    link.download = `popup-snapshot-${new Date().toISOString().split('T')[0]}.png` // Use ISO date for filename
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  catch (error) {
    console.error('Error generating screenshot:', error)
  }
  finally {
    // 4. Clean up the added tag ALWAYS
    if (root.contains(tag)) {
      root.removeChild(tag)
    }
    // Reset position style only if it was changed
    // Assuming it was empty before, can check originalRootPosition if needed
    root.style.position = ''

    // --- Restore buttons ---
    restoreExportButton()
    restoreEditButton() // Restore the edit button
    // --- End restoring buttons ---
  }
}
