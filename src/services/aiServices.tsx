export const getAIResponse = async (userPrompt: string, menuItems: any) => {
  // استدعاء المفتاح بالطريقة الصحيحة الخاصة بـ Vite
  const apiKey = import.meta.env.VITE_API_KEY; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `أنت مساعد مطعم خبير. هذه هي قائمة الطعام: ${JSON.stringify(menuItems)}. الزبون يقول: "${userPrompt}". أجب باختصار.`
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("خطأ من جوجل:", errorData);
      throw new Error(`خطأ ${response.status}: ${errorData.error.message}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("فشل الاتصال:", error);
    return "عذراً، تعذر الوصول للمساعد الذكي حالياً.";
  }
};