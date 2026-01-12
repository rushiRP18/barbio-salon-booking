const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log("Loaded GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
console.log(genAI)

async function summarizeReviews(avgRating, reviews) {
  if (!reviews || reviews.length === 0) {
    return `This shop has an average rating of ${avgRating} ⭐. No reviews yet to summarize.`;
  }

  const text = reviews.slice(0, 30).join("\n"); // avoid overload
  const prompt = `
This shop has an average rating of ${avgRating} out of 5.
Write a very short summary (1–2 lines) of what customers are saying based on these reviews:\n\n${text}
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return `This shop has an average rating of ${avgRating} ⭐. ${summary}`;
  } catch (err) {
    console.error("Error generating summary:", err);
    return `This shop has an average rating of ${avgRating} ⭐. Summary not available right now.`;
  }
}

module.exports = { summarizeReviews };
