import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const maxDuration = 295

export const fileIds = [
  'file-2MJ20Vt5PhDWePSd7aiMFcsv',
  'file-osL89ZZYvF5c2u1TJkPIBn73'
  // 'file-3d2a9C5qlpakv2q8TPGOfaeI',
  // 'file-E0SFqf5eHkEyU0fUXSI2S53Y',
  // 'file-9wOeoaAaZsiTCN3HfXMZLk8i',
  // 'file-EX0Rsqep4VI3KgGg9XU0R2iX',
  // 'file-WWddN7CZiw9eLlcQXzhpYRFB',
  // 'file-JL5wHFY8RsjPydapZbyGEMnD'
]

interface RequestBody {
  prompt?: string
  content?: string
}

export async function POST(request: Request) {
  try {
    const { prompt, content } = (await request.json()) as RequestBody

    if (!prompt || !content) {
      return NextResponse.json(
        { error: 'Please provide your required prompt and content.' },
        { status: 400 }
      )
    }
    const assistant = await openai.beta.assistants.create({
      instructions: `You are a helpful data science assistant. When you presented with data and question. you do a required calculation and present the result. 
         If required data is not presented in the given dataset, please refer the data given by user answer the question according to that dataset. If you failed to get the data from the file or data is not present in 
         the file, Then use user provided data. Last part of the response should be precise and answer every question asked by user. Do not mention if you failed to get data from files just answer the question
          in the last response, we are showing that response to user.
        `,
      model: 'gpt-4o',
      tools: [{ type: 'code_interpreter' }],
      tool_resources: {
        code_interpreter: {
          file_ids: fileIds
        }
      }
    })

    const thread = await openai.beta.threads.create({
      messages: [
        {
          content: content,
          role: 'user'
        },
        {
          role: 'user',
          content: prompt,
          attachments: fileIds.map(id => ({
            file_id: id,
            tools: [{ type: 'code_interpreter' }]
          }))
        }
      ]
    })

    let run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
      instructions: `Please Provide a detailed answer using provided CSV file. If you can not get the data from given csv file please refer this data and do not mention data is not present in the data. Just pretend you got the 
      answer by doing calculation from the given dataset in last response. Just make really sure that last response just contain result never mention the source of data and unavailability of data Just answer.
      Content starts here: \n '${content}' \n content ends here. \n 
      Last part of the answer should be precise and should answer every question provided by the user.`
    })

    let result = ''
    let imageId = ''

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(run.thread_id)
      for (const message of messages.data.reverse()) {
        // @ts-ignore
        console.log(`${message.role} > ${message.content[0]?.text?.value}`)
        if (message.role === 'assistant') {
          // @ts-ignore
          // result = message.content[0]?.text?.value
          for (const content of message.content) {
            // console.log("content", content)
            if (content.type === 'image_file') {
              imageId = content.image_file.file_id
            }
            if (content.type === 'text') {
              // @ts-ignore
              result = content.text.value
            }
          }
        }
      }
    } else {
      console.log(run.status)
      return NextResponse.json(
        { error: 'Open AI response error, Please try again.' },
        { status: 400 }
      )
    }

    if (result === '') {
      result = 'Please try again.'
    }

    return NextResponse.json({ message: result, imageId })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: 'Internal Server Error.' },
      { status: 500 }
    )
  }
}
