// Function to detect and filter out desktop/laptop systems
// DISABLED - This filter was causing too many false positives
function isDesktopOrLaptop(title) {
    // Always return false to disable filtering
    return false;
}

// Function to check if a component has a valid price (not $0 or null)
function hasValidPrice(item) {
    const price = parseFloat(item.price || item.currentPrice || item.basePrice);
    return !isNaN(price) && price > 0;
}

module.exports = { hasValidPrice, isDesktopOrLaptop };
