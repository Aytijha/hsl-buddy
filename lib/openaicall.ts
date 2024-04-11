const callOpenAI3_5_turbo = async (token:string, body:any) => {
    const response = await fetch("https://api.dev.surveill.ai/user/list", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    });
    const data = await response.json();
    return data;
};

export default callOpenAI3_5_turbo;

// {
//     "model": "gpt-3.5-turbo",
//     "top_p": 0.95,
//     "temperature": 0.75,
//     "max_tokens": 256,
//     "frequency_penalty": 1.1,
//     "messages": [
//       {
//         "role": "system",
//         "content": `ONLY generate plain sentences without prefix of who is speaking. DO NOT use ${companion.name}: prefix.
        
//         ${companion.instructions}

//         Below are relevant details about ${companion.name}'s past and the conversation you are in.
        
//         ${recentChatHistory}`
//       },
//       {
//         "role": "user",
//         "content": `${prompt}`
//       }
//     ]
//   }