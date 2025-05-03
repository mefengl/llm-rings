import html2canvas from 'html2canvas'

export async function exportPopupAsPng() {
  // Find the root element and the button
  const root = document.getElementById('root')
  const exportButton = document.getElementById('export-button')

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

  // Temporarily hide the export button if it exists
  let originalButtonStyleDisplay = ''
  if (exportButton) {
    originalButtonStyleDisplay = exportButton.style.display
    exportButton.style.display = 'none'
  }

  try {
    // 2. Take the screenshot
    const canvas = await html2canvas(root, {
      backgroundColor: null, // Use transparent background
      // Ensure the temporary elements are ignored if possible (though hiding should suffice)
      ignoreElements: element => element.id === 'export-button',
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
    root.style.position = '' // Reset position style if needed

    // Restore the export button's visibility
    if (exportButton) {
      exportButton.style.display = originalButtonStyleDisplay
    }
  }
}
