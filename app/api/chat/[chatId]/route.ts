import dotenv from "dotenv";
import { StreamingTextResponse, LangChainStream } from "ai";
import { auth, currentUser } from "@clerk/nextjs";
import { Replicate } from "langchain/llms/replicate";
import { CallbackManager } from "langchain/callbacks";
import { NextResponse } from "next/server";

import { MemoryManager } from "@/lib/memory";
import { rateLimit } from "@/lib/rate-limit";
import prismadb from "@/lib/prismadb";
import callOpenAI3_5_turbo from "@/lib/openaicall";

dotenv.config({ path: `.env` });

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { prompt } = await request.json();
    const user = await currentUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const identifier = request.url + "-" + user.id;
    const { success } = await rateLimit(identifier);

    if (!success) {
      return new NextResponse("Rate limit exceeded", { status: 429 });
    }

    const companion = await prismadb.companion.update({
      where: {
        id: params.chatId
      },
      data: {
        messages: {
          create: {
            content: prompt,
            role: "user",
            userId: user.id,
          },
        },
      }
    });

    if (!companion) {
      return new NextResponse("Companion not found", { status: 404 });
    }

    const name = companion.id;
    const companion_file_name = name + ".txt";

    const companionKey = {
      companionName: name!,
      userId: user.id,
      modelName: "llama2-13b",
    };
    const memoryManager = await MemoryManager.getInstance();

    const records = await memoryManager.readLatestHistory(companionKey);
    if (records.length === 0) {
      await memoryManager.seedChatHistory(companion.seed, "\n\n ", companionKey);
    }
    await memoryManager.writeToHistory("Human: " + prompt + "\n ", companionKey);

    // Query Pinecone

    const recentChatHistory = await memoryManager.readLatestHistory(companionKey);
    
    console.log(recentChatHistory)

    // Right now the preamble is included in the similarity search, but that
    // shouldn't be an issue

    const similarDocs = await memoryManager.vectorSearch(
      recentChatHistory,
      companion_file_name
    );

    console.log(similarDocs)
    
    let relevantHistory = "";
    if (!!similarDocs && similarDocs.length !== 0) {
      relevantHistory = similarDocs.map((doc) => doc.pageContent).join("\n");
    }
    console.log("Relevant History: ", relevantHistory)
    
    const { handlers } = LangChainStream();
    console.log("handlers: ", handlers)
    
    // Call Replicate for inference
    const model = new Replicate({
      model:
      "lucataco/llama-2-13b-chat:18f253bfce9f33fe67ba4f659232c509fbdfb5025e5dbe6027f72eeb91c8624b",
      input: {
        max_length: 2048,
      },
      apiKey: process.env.REPLICATE_API_TOKEN,
      callbackManager: CallbackManager.fromHandlers(handlers),
    });
    console.log("model: ", model)
    
    // Turn verbose on for debugging
    model.verbose = true;

    const contentseed = "ONLY generate sentences without prefix of who is speaking. DO NOT use"+companion.name+": prefix. \n\n Use resources across the internet to improve your answer if applicable. And try NOT to be repititive with the responses you give. Also do not use the exact same sentences used earlier in the chat. Be creative, but do not propagate any false information. Also, DO NOT say anything about your GPT model or anything related to the code that you're functioning on! And do not engage in conversations outside of your domain. \n\n"+companion.instructions+"\n\n"+"Below are relevant details about "+companion.name+"'s past and the conversation you are in.\n\n"+recentChatHistory

    console.log(contentseed)
    console.log(prompt)
    
    console.log("Calling OpenAI API")
    const result = await callOpenAI3_5_turbo(process.env.OPENAI_API_KEY!, {
      "model": "gpt-4o",
      "top_p": 0.95,
      "temperature": 0.75,
      "max_tokens": 256,
      "frequency_penalty": 1.1,
      "messages": [
        {
          "role": "system",
          "content": contentseed
        },
        {
          "role": "user",
          "content": prompt
        }
      ]
    });

    const response = result['choices'][0]['message']['content'];

    // const resp = String(
    //   await model
    //     .call(
    //       `
    //     ONLY generate plain sentences without prefix of who is speaking. DO NOT use ${companion.name}: prefix. 

    //     ${companion.instructions}

    //     Below are relevant details about ${companion.name}'s past and the conversation you are in.
    //     ${relevantHistory}


    //     ${recentChatHistory}\n${companion.name}:`
    //     )
    //     .catch(console.error)
    // );
    // console.log("Resp: ", resp)

    // const cleaned = resp.replaceAll(",", "");
    // const chunks = cleaned.split("\n");
    // const response = chunks[0];

    await memoryManager.writeToHistory("" + response.trim(), companionKey);
    var Readable = require("stream").Readable;

    let s = new Readable();
    s.push(response);
    s.push(null);
    if (response !== undefined && response.length > 1) {
      memoryManager.writeToHistory("" + response.trim(), companionKey);

      await prismadb.companion.update({
        where: {
          id: params.chatId
        },
        data: {
          messages: {
            create: {
              content: response.trim(),
              role: "system",
              userId: user.id,
            },
          },
        }
      });
    }

    return new StreamingTextResponse(s);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
};
