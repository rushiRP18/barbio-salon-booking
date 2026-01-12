from transformers import pipeline

# Sentiment model (5-star classification)
sentiment_analyzer = pipeline("sentiment-analysis",
    model="nlptown/bert-base-multilingual-uncased-sentiment")

# Summarizer model
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
reviews = [
    "The staff was friendly but the waiting time was too long.",
    "Great quality products and affordable prices.",
    "The shop is clean and well-maintained.",
    "Customer service is not very responsive.",
    "Best experience ever, I will definitely come back!"
]
sentiments = sentiment_analyzer(reviews)

# Attach sentiment results to reviews
for r, s in zip(reviews, sentiments):
    print(f"Review: {r}\nPredicted Sentiment: {s}\n")
