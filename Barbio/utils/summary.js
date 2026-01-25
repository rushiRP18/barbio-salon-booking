const { HfInference } = require("@huggingface/inference");

const hf = new HfInference(process.env.HF_API_TOKEN);


async function summarizeReviews(avgRating, reviews) {
  if (!reviews || reviews.length === 0) {
    return `This shop has an average rating of ${avgRating} ⭐. No reviews yet to summarize.`;
  }

  const text = reviews.slice(0, 30).join("\n");

  const prompt = `
This shop has an average rating of ${avgRating} out of 5.
Write a very short summary (1–2 lines) of what customers are saying based on these reviews:

${text}
`;

  try {
    const response = await hf.textGeneration({
      model: "mistralai/Mixtral-8x7B-Instruct-v0.1"
,
      inputs: prompt,
      parameters: {
        max_new_tokens: 80,
        temperature: 0.4,
        top_p: 0.9,
        repetition_penalty: 1.1
      }
    });

    const summary = response.generated_text
      .replace(prompt, "")
      .trim();

    return `This shop has an average rating of ${avgRating} ⭐. ${summary}`;
  } catch (err) {
    console.error("Error generating summary:", err);
    return `This shop has an average rating of ${avgRating} ⭐. Summary not available right now.`;
  }
}

module.exports = { summarizeReviews };
