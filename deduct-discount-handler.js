// Add this event handler to the travel-service.js file after line 140 (after the existing action implementations)

/**
 * Deduct discount from BookingFee and recalculate TotalPrice
 * Only works when TravelStatus_code = 'A' (Accepted) and BookingFee is not null
 */
this.on('deductDiscount', async (req) => {
  const { percent } = req.data
  const travelUUID = req.params[0] // Get the Travel UUID from the request parameters
  
  // Fetch the current travel record
  const travel = await SELECT.one.from(Travel.drafts || Travel)
    .where({ TravelUUID: travelUUID })
  
  if (!travel) {
    return req.reject(404, 'Travel record not found.')
  }
  
  // Check if travel status is 'A' (Accepted)
  if (travel.TravelStatus_code !== 'A') {
    return req.reject(400, 'Discount can only be applied to accepted travels.', 'TravelStatus')
  }
  
  // Check if BookingFee is not null and greater than 0
  if (!travel.BookingFee || travel.BookingFee <= 0) {
    return req.reject(400, 'BookingFee must be greater than 0 to apply discount.', 'BookingFee')
  }
  
  // Validate percentage (should be between 1-100 as defined in the CDS type)
  if (percent < 1 || percent > 100) {
    return req.reject(400, 'Discount percentage must be between 1 and 100.', 'percent')
  }
  
  // Calculate the discount amount
  const discountAmount = (travel.BookingFee * percent) / 100
  const newBookingFee = travel.BookingFee - discountAmount
  
  // Update the BookingFee with the discounted amount
  await UPDATE(Travel.drafts || Travel)
    .set({ BookingFee: newBookingFee })
    .where({ TravelUUID: travelUUID })
  
  // Recalculate the total price using the existing helper method
  await this._update_totals4(travelUUID)
  
  // Return the updated travel record
  const updatedTravel = await SELECT.one.from(Travel.drafts || Travel)
    .where({ TravelUUID: travelUUID })
  
  return updatedTravel
})