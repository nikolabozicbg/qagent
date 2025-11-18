export default () => ({
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    // Use cheaper model for testing: gpt-3.5-turbo, or premium: gpt-4-turbo-preview
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  },
});
