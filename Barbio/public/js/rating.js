function calAvg(shop) {
  if (!shop.reviews || shop.reviews.length === 0) return 0;

  let total = 0;
  for (let review of shop.reviews) {
    total += review.rating;
  }
  return Math.round(total / shop.reviews.length);
}

module.exports = {
  calAvg
};
