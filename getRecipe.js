import Groq from "groq-sdk";
import * as dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { ingredients } = req.body;
      const prompt = `Suggest a recipe that includes the following ingredients: ${ingredients.join(', ')}.`;

      const chatCompletion = await getGroqChatCompletion(prompt);
      const recipe = chatCompletion.choices[0]?.message?.content || 'No recipe found';
      
      res.status(200).json({ recipe });
    } catch (error) {
      console.error('Error fetching recipe:', error);
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getGroqChatCompletion(prompt) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama3-8b-8192",
  });
}
