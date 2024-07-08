import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})


export const maxDuration = 295


export const fileIds = [
  'file-2MJ20Vt5PhDWePSd7aiMFcsv',
  'file-osL89ZZYvF5c2u1TJkPIBn73'
]

interface RequestBody {
  prompt?: string
}

export async function POST(request: Request) {
  try {
    const { prompt } = (await request.json()) as RequestBody

    if (!prompt) {
      return NextResponse.json(
        { error: 'Please provide your required prompt.' },
        { status: 400 }
      )
    }
    const assistant = await openai.beta.assistants.create({
      instructions:
        'You are a helpful data science assistant. When you presented with data you do a require calculation and present the result. Also do not do too many steps, if the data is not available, use the the data most accurate to your knowledge as a placeholder.',
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
      instructions: `Please Provide a detailed answer using provided CSV file. Last part of the answer should be precise and should answer every question provided by the user.`
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

    if(result === '') {
      result = "Please try again."
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
